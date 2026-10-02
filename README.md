# Idea Flow

Monorepo: a React/Vite web app, a Node/Fastify API and PostgreSQL, orchestrated
with Docker Compose.

```
apps/web     React + Vite        (owned by the frontend agent)
apps/api     Node + Fastify      (owned by the backend agent)
infra/       postgres + ops scripts
compose.yaml single stack: web, api, database, network
```

## Requirements

- Docker Desktop (Compose v2.24+; developed against v5.5)
- Node 22 if you want to run anything outside Docker

## Quick start (development)

```bash
cp .env.example .env
docker compose up -d --build
docker compose logs -f web api
```

- web: <http://localhost:5173>
- api: <http://localhost:3000> (`GET /health` must return 200)
- db: `127.0.0.1:5432`, database `idea_flow`

Sources are bind mounted, so edits reload without a rebuild. `node_modules`
lives in named volumes so the host copy never shadows the container's Linux
installs.

## Operating notes

- The whole stack is one compose project, `idea-flow`, defined in `compose.yaml`.
- Every published port is bound to loopback only:
  - web: `127.0.0.1:5173`
  - api: `127.0.0.1:3000`
  - db: `127.0.0.1:5432`
- PostgreSQL data lives in the named volume `postgres_data_dev` (not committed
  to git).
- Watchdog: set `WATCH_POLLING=false` in `.env` if bind-mounted hot reload is
  fast enough and the CPU cost is not acceptable.

## Common commands

```bash
# validate the compose file
docker compose config -q

# logs / status / shell
docker compose logs -f web api
docker compose ps
docker compose exec api sh

# nuke the stack AND its database volume
./infra/scripts/dev-reset.sh
```

`infra/README.md` documents the contract the app Dockerfiles must satisfy.
