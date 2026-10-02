# Infrastructure contract

What the root `compose.yaml` assumes about the app images. **These are
requirements, not suggestions** — if a Dockerfile deviates, the stack breaks in
a way that is annoying to debug from a container log.

## Dockerfile locations and build targets

Both images are built with the **repository root as build context**:

```yaml
context: .
dockerfile: apps/api/Dockerfile
target: dev
```

That is why the root `.dockerignore` exists — it is the file that keeps
`node_modules`, `dist`, `.git` and `.env` out of the context. Secrets being
excluded is the important part.

| app | file | required stage |
|---|---|---|
| api | `apps/api/Dockerfile` | `dev` |
| web | `apps/web/Dockerfile` | `dev` |

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

## Endpoints

| endpoint | consumer | requirement |
|---|---|---|
| `GET /health` on the api | compose healthcheck | must return 2xx **without** auth and **without** a working database dependency being a hard requirement. It is the readiness signal for the api container: if it is not implemented, the container never becomes healthy. |

The api serves **unprefixed** routes (`/health`, `/healthz`, `/graphs`,
`/boards`, …). There is no reverse proxy and no `/api` prefix in the local
stack: the browser talks to the api directly.

## Environment variables

Passed by Compose — the app only has to read them:

| variable | value |
|---|---|
| `NODE_ENV` | `development` |
| `HOST` | `0.0.0.0` |
| `PORT` | `3000` |
| `DATABASE_URL` | `postgres://…@postgres:5432/idea_flow` |
| `CORS_ORIGIN` | `http://localhost:5173` |
| `TZ` | from `.env` |

Host is always the **service name** `postgres`, never `localhost`.

### VITE_API_URL

`VITE_*` variables are inlined at build time by Vite and read by the dev server
from the environment / `.env`.

- The web container reads `VITE_API_URL` (default the absolute
  `http://localhost:3000`) through `env_file`. That works with zero extra
  frontend config: the api is published on host port 3000 and CORS-enabled for
  `http://localhost:5173`.
- To use a Vite proxy instead, set `VITE_API_URL=/api` in `.env` and add the
  matching `server.proxy` entry to the web dev config.

## Postgres

- image `postgres:17-alpine`, service name `postgres`, database `idea_flow`
- data lives in the named volume `postgres_data_dev`
- `infra/postgres/init/` is mounted at `/docker-entrypoint-initdb.d` and runs
  **only on first initialisation** of an empty data volume. Anything added
  later needs a migration, not a file drop.

## Database migrations

Migrations must not run from the `api` container's entrypoint. Run them as a
one-off:

```bash
docker compose run --rm api npm run migrate
```

`run` honours `depends_on`, so postgres is already healthy and reachable.

## Deliberate omissions

- **No Redis.** Not in the stack; do not assume `redis://` resolves.
- **No reverse proxy / TLS.** The local stack publishes Vite (`5173`) and the
  api (`3000`) directly on loopback.
- **No `read_only` filesystem / non-root enforcement on the app containers.**
  Adding those needs the images to declare a writable path first, and a wrong
  guess breaks writes.

## Resetting the stack

`./infra/scripts/dev-reset.sh` destroys the stack **and its database volume**.
The guard resolves the compose project (`idea-flow`) and requires the expected
service set (`api`/`postgres`/`web`) before it runs `docker compose down
--volumes`. It deliberately does **not** pass `--remove-orphans`, so the reset
can never reach resources outside the declared project.
