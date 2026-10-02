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
docker compose --profile dev run --rm api npm run migrate
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

## Dev vs Prod (profiles)

The stack uses a single `compose.yaml` with profiles:

- **dev** (profile `dev`): services `postgres`, `api`, `web`. 
  - Published ports (loopback only): `127.0.0.1:${POSTGRES_PORT:-5432}:5432`, `127.0.0.1:${API_PORT:-3000}:3000`, `127.0.0.1:${WEB_PORT:-5173}:5173`
  - Hot reload (tsx watch, Vite HMR), bind mounts of source code, `restart: "no"` for api.
  - Uses `.env` by default (via `APP_ENV_FILE`), defaults are safe so `docker compose --profile dev up` works from a clean clone.

- **prod** (profile `prod`): services `postgres-prod`, `api-prod`, `web-prod`.
  - Published ports: only `web-prod` on `${PROD_WEB_PORT:-8080}:8080` (host). API and Postgres are **not published** (api exposed internally only). 
  - No source mounts; images built with `target: prod`. 
  - Hardening: `api-prod` has `cap_drop: [ALL]` and `security_opt: [no-new-privileges:true]`. 
  - `depends_on` uses `service_healthy` conditions where applicable. 
  - Uses `.env.prod` by default (via `APP_ENV_FILE`), and sensitive values are required via `:?` in prod.

Commands:
- Dev: `docker compose --profile dev up -d --build`
- Prod: `docker compose --env-file .env.prod --profile prod up -d --build`
- Validate: `docker compose --profile dev config -q && docker compose --env-file .env.prod --profile prod config -q`

## Route contract

The `/api` prefix is **added by the proxy** and **must NOT** be implemented by the API routes:

- **Prod**: `infra/nginx/web.conf` runs on the web container (port 8080) and proxies `/api/*` to the API. It strips the `/api` prefix, so the API receives unprefixed paths (e.g., `/graphs/demo`, `/health`).
- **Dev**: the browser reaches the API directly at `http://localhost:3000` by default (or via Vite proxy if configured). The API serves only unprefixed canonical routes (`/graphs`, `/graphs/demo`, `/boards`, `/boards/:id`, `/health`, `/healthz`).

Therefore, API route handlers are registered at root paths. Any `/api/*` aliases were intentionally removed to prevent double-prefixing in prod. The nginx config sets `$api_upstream "api:3000"` and we expose the prod API service under the network alias `api` (via `networks.idea-flow.aliases: [api]`) so the proxy resolves correctly regardless of the service name `api-prod`.

## CORS

- **Dev**: browser calls the API directly on a different origin (5173 → 3000). CORS is enabled when `CORS_ORIGIN` is non-empty. Default for dev is `http://localhost:${WEB_PORT:-5173}`.
- **Prod**: browser calls the same origin as the web server (8080) and nginx proxies `/api` — so no cross-origin requests occur. For prod, `CORS_ORIGIN` defaults to empty string (`""`) to disable CORS, which matches the API config (`corsEnabled = corsOrigin !== ''`). This is intentionally empty to avoid opening CORS in production when proxied on the same origin.

## Resetting dev (dev only)

`./infra/scripts/dev-reset.sh` destroys the development stack **and its database
volume**. Dev and prod share the single compose project name `idea-flow`
(Compose v2 has no per-profile project name), so the reset script cannot rely on
the project name alone to tell them apart. Instead its guard:

1. resolves the project as `idea-flow`, and
2. renders the **dev profile** service set and requires `api`/`postgres`/`web`,
   refusing if any prod service (`api-prod`/`postgres-prod`/`web-prod`) is
   present.

Only then does it run `docker compose -f compose.yaml --profile dev down
--volumes`. It deliberately does **not** pass `--remove-orphans`: with a shared
project name that flag can reach resources outside the active profile, i.e.
prod. There is no prod reset — tearing prod down is an explicit, manual
operation.
