# syntax=docker/dockerfile:1.7
#
# Idea Flow — api image.
#
# Built with the REPOSITORY ROOT as context (compose sets `context: .` and
# `dockerfile: apps/api/Dockerfile`), so every COPY below is prefixed with
# apps/api. The root .dockerignore keeps node_modules, dist and .env out of that
# context.
#
# Targets required by infra/README.md:
#   dev  — WORKDIR /app, deps installed, NO source baked in (compose bind mounts
#          it), no CMD (compose supplies `npm run dev`), must listen 0.0.0.0:3000
#   prod — WORKDIR /app, production dependencies only, CMD runs dist/index.js,
#          foreground, responsive to SIGTERM
#
#   docker compose -f compose.yaml -f compose.dev.yaml build api
#   docker compose -f compose.yaml -f compose.prod.yaml build api

ARG NODE_IMAGE=node:22-alpine

# ---------------------------------------------------------------------------
# deps — the single install, shared by dev and build
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app

# The lock file is what makes `npm ci` deterministic; without it the build
# silently drifts to whatever npm resolves on the day.
COPY apps/api/package.json apps/api/package-lock.json ./

ENV NODE_ENV=development
RUN npm ci --no-fund --no-audit

# ---------------------------------------------------------------------------
# dev — toolchain only
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS dev
WORKDIR /app

ENV NODE_ENV=development \
    # bind mounts do not always deliver inotify events on Docker Desktop
    CHOKIDAR_USEPOLLING=true \
    WATCHPACK_POLLING=true

# Only dependencies live here. The bind mount provides the source, and baking it
# in would let a stale copy shadow the mounted one.
COPY --from=deps /app/node_modules ./node_modules
COPY apps/api/package.json ./package.json

EXPOSE 3000

# No CMD on purpose: compose runs `npm run dev`, and the port is published, so
# the server MUST bind 0.0.0.0 (it does — see src/config.ts).

# ---------------------------------------------------------------------------
# build — compile TypeScript
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS build
WORKDIR /app

ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY apps/api/ ./

# `npm run build` is `tsc -p tsconfig.build.json`: an image that does not compile
# never reaches prod.
RUN npm run build

# ---------------------------------------------------------------------------
# prod — production dependencies only, compiled output
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS prod
WORKDIR /app

ENV NODE_ENV=production

# Re-resolve without devDependencies from the same lock file, so prod gets
# exactly the dependency tree that was tested and nothing extra.
COPY apps/api/package.json apps/api/package-lock.json ./
RUN npm ci --omit=dev --no-fund --no-audit && npm cache clean --force

COPY --from=build /app/dist ./dist

# The migrate script reads these at runtime; `npm run migrate` is a one-off
# compose service, not the entrypoint.
COPY apps/api/migrations ./migrations

# Drop root. compose prod runs with cap_drop: ALL and no-new-privileges, so the
# process needs nothing that only root has — port 3000 is unprivileged.
USER node

EXPOSE 3000

# exec form, no shell wrapper: node becomes PID 1's direct child and receives
# SIGTERM from `docker stop`, which is what lets Fastify drain in-flight requests
# inside compose's 30s stop_grace_period.
CMD ["node", "dist/index.js"]