# syntax=docker/dockerfile:1.7
#
# Idea Flow — web image.
#
# Built with the REPOSITORY ROOT as context (compose sets `context: .` and
# `dockerfile: apps/web/Dockerfile`), so every COPY below is prefixed with
# apps/web. The root .dockerignore is what keeps node_modules, dist and .env
# out of that context.
#
# Targets required by infra/README.md:
#   dev  — WORKDIR /app, deps installed, NO source baked in (compose bind
#          mounts it), and no CMD: compose supplies
#          `npm run dev -- --host 0.0.0.0 --port 5173`
#   prod — static server on 8080 serving the Vite build, with the shared
#          nginx config from infra/
#
#   docker compose -f compose.yaml -f compose.dev.yaml build web
#   docker compose -f compose.yaml -f compose.prod.yaml build web

ARG NODE_IMAGE=node:22-alpine
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.29-alpine

# ---------------------------------------------------------------------------
# deps — the single install, shared by dev and build
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app

# a lock file is what makes `npm ci` deterministic; without it the build would
# silently drift to whatever npm resolves on the day
COPY apps/web/package.json apps/web/package-lock.json ./

ENV NODE_ENV=development
RUN npm ci --no-fund --no-audit

# ---------------------------------------------------------------------------
# dev — toolchain only
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS dev
WORKDIR /app

ENV NODE_ENV=development \
    # bind mounts do not always deliver inotify events on Docker Desktop
    CHOKIDAR_USEPOLLING=true

# only dependencies live here: the bind mount provides the source, and baking
# it in would let a stale copy shadow the mounted one
COPY --from=deps /app/node_modules ./node_modules
COPY apps/web/package.json ./package.json

EXPOSE 5173

# No CMD on purpose. compose runs `npm run dev -- --host 0.0.0.0 --port 5173`,
# and the port is published, so Vite MUST bind 0.0.0.0.

# ---------------------------------------------------------------------------
# build — compile the app, honouring VITE_API_URL
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS build
WORKDIR /app

# VITE_* is inlined at build time, never read at runtime, which is exactly why
# prod passes it as a build arg (infra/README.md).
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL} \
    NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY apps/web/ ./

# `npm run build` is `tsc --noEmit && vite build`: an image that typechecks
# never reaches prod
RUN npm run build

# ---------------------------------------------------------------------------
# prod — static files on 8080
# ---------------------------------------------------------------------------
FROM ${NGINX_IMAGE} AS prod

# the contract, owned by infra: it serves /healthz for the compose healthcheck
# and proxies /api to the api on the same origin
COPY infra/nginx/web.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# 8080 (not 80) so the image can stay unprivileged, with no
# CAP_NET_BIND_SERVICE — this base image already runs as a non-root user
EXPOSE 8080

# No CMD or ENTRYPOINT: the base image's nginx entrypoint is the command, and
# it must stay in the foreground to receive SIGTERM (compose sets init: true).
