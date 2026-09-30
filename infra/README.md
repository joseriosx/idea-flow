# Infrastructure contract

What the root Compose files assume about the app images. **These are
requirements, not suggestions** — if a Dockerfile deviates, the stack breaks in
a way that is annoying to debug from a container log.

## Dockerfile locations and build targets

Both images are built with the **repository root as build context**:

```yaml
context: .
dockerfile: apps/api/Dockerfile
target: dev      # or: prod
```

That is why the root `.dockerignore` exists — it is the file that keeps
`node_modules`, `dist`, `.git` and `.env` out of the context. Secrets being
excluded is the important part.

| app | file | required stages |
|---|---|---|
| api | `apps/api/Dockerfile` | `dev`, `prod` |
| web | `apps/web/Dockerfile` | `dev`, `prod` |

### `dev` stage (both apps)

- `WORKDIR /app`
- toolchain + dependencies installed into `/app/node_modules`
- **must not** bake application source into the image; the bind mount provides
  it
- the `dev` command is supplied by Compose, so no `CMD` is required:

  | service | command | working dir | must listen on |
  |---|---|---|---|
  | `api` | `npm run dev` | `/app` | `0.0.0.0:3000` |
  | `web` | `npm run dev -- --host 0.0.0.0 --port 5173` | `/app` | `0.0.0.0:5173` |

  So the apps need a `dev` script in `package.json`, and — the usual failure —
  it must exist. `npm run dev` must not be missing or the container exits
  immediately.

### `prod` stage

- `api`: `WORKDIR /app`, production dependencies only, `CMD` runs the compiled
  entrypoint. **Compose does not set a command in prod** — the image owns its
  entrypoint, so the exact path (`dist/index.js`, `dist/server.js`, …) is the
  app's decision. The process must stay in the foreground and respond to
  `SIGTERM` (`init: true` is already set).
- `web`: static server on port **8080**, serving the Vite build from
  `/usr/share/nginx/html`, and it must copy this directory's config:

  ```dockerfile
  COPY infra/nginx/web.conf /etc/nginx/conf.d/default.conf
  ```

  8080 (not 80) so the container can run as a non-root user without
  `CAP_NET_BIND_SERVICE`.

## Endpoints

| endpoint | consumer | requirement |
|---|---|---|
| `GET /health` on the api | compose healthcheck, and `web` waits on it | must return 2xx **without** auth and **without** a working database dependency being a hard requirement. It is the readiness signal for the whole stack: if it is not implemented, prod never becomes healthy and `web` never starts. |
| `GET /healthz` on the web server | compose healthcheck | served by `infra/nginx/web.conf`, no app code needed. |
| `/api/*` | browser | `infra/nginx/web.conf` strips the `/api` prefix, so **the api serves unprefixed routes** (`/health`, `/users`, …). Do not register Fastify routes under an `/api` prefix or they will be served as `/api/api/…` in prod. |

## Environment variables

Passed by Compose — the app only has to read them:

| variable | value in dev | value in prod |
|---|---|---|
| `NODE_ENV` | `development` | `production` |
| `HOST` | `0.0.0.0` | `0.0.0.0` |
| `PORT` | `3000` | `3000` |
| `DATABASE_URL` | `postgres://…@postgres:5432/idea_flow` | same, from `.env.prod` |
| `CORS_ORIGIN` | `http://localhost:5173` | falls back to `PUBLIC_URL` |
| `TZ` | from `.env` | from `.env` |

Host is always the **service name** `postgres`, never `localhost`.

### VITE_API_URL

`VITE_*` variables are inlined at **build time**, not read at runtime.

- dev: `/app` is bind mounted, so `VITE_API_URL` reaches the browser through
  the dev server. Default is the absolute `http://localhost:3000`, which works
  with zero frontend config (the api is CORS-enabled for `http://localhost:5173`).
  To use a Vite proxy instead, set `VITE_API_URL=/api` in `.env` and add the
  matching `server.proxy` entry.
- prod: passed as a **build arg** (`build.args.VITE_API_URL`), default `/api`.
  The browser then calls the same origin and nginx proxies it — no CORS.

## Postgres

- image `postgres:17-alpine`, service name `postgres`, database `idea_flow`
- `infra/postgres/init/` is mounted at `/docker-entrypoint-initdb.d` and runs
  **only on first initialisation** of an empty data volume. Anything added
  later needs a migration, not a file drop.
- prod writes to a host directory (`POSTGRES_DATA_PATH`, default
  `./infra/postgres/data`) instead of a Docker volume, so backup is a file copy.
  That directory is git-ignored and is owned by the container's `postgres` user
  (uid 999) — do not `sudo chown` it back to your user.

## Database migrations

Migrations must not run from the `api` container's entrypoint: with
`restart: unless-stopped` and two replicas during a rolling update, two
containers would race. Run them as a one-off:

```bash
docker compose -f compose.yaml -f compose.dev.yaml run --rm api npm run migrate
```

`run` honours `depends_on`, so postgres is already healthy and reachable.

## Deliberate omissions

- **No Redis.** Not in the stack; do not assume `redis://` resolves.
- **No reverse proxy / TLS in front of the stack.** `web` publishes `:8080` on
  all interfaces so an external proxy (Traefik, Caddy, the load balancer) can
  front it. Only `web` is exposed; the api is `expose`d internally and reached
  through `/api`.
- **No `read_only` filesystem / non-root enforcement on the app containers.**
  Adding those needs the images to declare a writable path first, and a wrong
  guess breaks writes in production. Revisit once the images are final.
