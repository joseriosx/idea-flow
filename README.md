# Idea Flow

Monorepo: a React/Vite web app, a Node/Fastify API and PostgreSQL, orchestrated
with Docker Compose.

```
apps/web     React + Vite        (owned by the frontend agent)
apps/api     Node + Fastify      (owned by the backend agent)
infra/       nginx + postgres + ops scripts
compose.yaml shared base: database, network, logging
```

## Requirements

- Docker Desktop (Compose v2.24+; developed against v5.5)
- Node 22 if you want to run anything outside Docker

## Quick start (development)

```bash
cp .env.example .env
docker compose -f compose.yaml -f compose.dev.yaml up -d --build
docker compose -f compose.yaml -f compose.dev.yaml logs -f web api
```

- web: <http://localhost:5173>
- api: <http://localhost:3000> (`GET /health` must return 200)
- db: `127.0.0.1:5432`, database `idea_flow`

Sources are bind mounted, so edits reload without a rebuild. `node_modules`
lives in named volumes so the host copy never shadows the container's Linux
installs.

## Production

```bash
cp .env.example .env.prod      # then apply the PROD ONLY block in that file
docker compose --env-file .env.prod -f compose.yaml -f compose.prod.yaml up -d --build
```

`web` is the only published port (`:8080`) and it reverse-proxies `/api` to the
api, so the browser stays on a single origin and CORS disappears. The api must
answer `GET /health` or the stack will never be considered ready.

## Operating notes

| | dev | prod |
|---|---|---|
| compose project | `idea-flow-dev` | `idea-flow-prod` |
| database volume | `idea-flow-dev_postgres_data` | `infra/postgres/data` (host dir) |
| api / db published on | `127.0.0.1` | `127.0.0.1` |
| web published on | `127.0.0.1:5173` | `0.0.0.0:8080` |

- Separate projects mean dev and prod never share data or network.
- **They do collide on host port 5432.** If you need both stacks running at
  once, change `POSTGRES_PORT` in `.env.prod`.
- Prod secrets are mandatory: compose aborts on a missing value rather than
  falling back to a development default.
- Watchdog: set `WATCH_POLLING=false` in `.env` if bind-mounted hot reload is
  fast enough and the CPU cost is not acceptable.

## Common commands

```bash
# validate the compose files (what CI should run)
docker compose -f compose.yaml -f compose.dev.yaml config -q
docker compose --env-file .env.prod -f compose.yaml -f compose.prod.yaml config -q

# logs / status / shell
docker compose -f compose.yaml -f compose.dev.yaml logs -f web api
docker compose -f compose.yaml -f compose.dev.yaml ps
docker compose -f compose.yaml -f compose.dev.yaml exec api sh

# nuke the dev stack AND its database (refuses to touch prod)
./infra/scripts/dev-reset.sh
```

`infra/README.md` documents the contract the app Dockerfiles must satisfy.
