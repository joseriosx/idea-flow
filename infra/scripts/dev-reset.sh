#!/usr/bin/env bash
#
# Destroy the DEVELOPMENT stack, including its database volume.
#
# Safety: dev and prod share the SAME compose project name (`idea-flow`), so the
# project name alone cannot distinguish them (Compose v2 has no per-profile
# project name). The guard therefore checks two things:
#   1. the resolved project is `idea-flow`, and
#   2. the resolved *dev* service set contains api/postgres/web and contains no
#      prod service (api-prod/postgres-prod/web-prod).
# Only then does it run `down --profile dev`, so it can never wipe prod data.
#
# `--remove-orphans` is intentionally NOT used: with a shared project name that
# flag can reach resources outside the active profile (i.e. prod).
#
#   ./infra/scripts/dev-reset.sh              # ask before deleting
#   ./infra/scripts/dev-reset.sh --yes        # no prompt (CI / scripted)
#

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILES=(-f compose.yaml)
EXPECTED_PROJECT="idea-flow"
DEV_SERVICES=(api postgres web)
PROD_SERVICES=(api-prod postgres-prod web-prod)
ASSUME_YES=false

for arg in "$@"; do
  case "$arg" in
    --yes|-y) ASSUME_YES=true ;;
    --help|-h)
      sed -n '2,18p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found in PATH" >&2
  exit 1
fi

# Resolves the project name from the fully-rendered dev profile. Prefers jq,
# falls back to sed so the script works without jq installed.
resolve_project() {
  local json
  json="$(docker compose "${COMPOSE_FILES[@]}" --profile dev config --format json 2>/dev/null)" || return 1
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$json" | jq -r '.name // empty'
  else
    # tolerate pretty-printed JSON: "name": "idea-flow"
    printf '%s' "$json" \
      | sed -n 's/^[[:space:]]*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
      | head -1
  fi
}

# Newline-delimited service names of the dev profile.
resolve_services() {
  docker compose "${COMPOSE_FILES[@]}" --profile dev config --services 2>/dev/null
}

# Exact-line membership test without requiring grep.
has_service() {
  [[ $'\n'"$1"$'\n' == *$'\n'"$2"$'\n'* ]]
}

PROJECT="$(resolve_project || true)"

if [[ "$PROJECT" != "$EXPECTED_PROJECT" ]]; then
  echo "refusing to run: expected project '$EXPECTED_PROJECT', resolved '${PROJECT:-<unknown>}'" >&2
  exit 1
fi

SERVICES="$(resolve_services || true)"

# Must look like the DEV family: every dev service present...
for svc in "${DEV_SERVICES[@]}"; do
  if ! has_service "$SERVICES" "$svc"; then
    echo "refusing to run: dev service '$svc' missing from resolved profile (got: ${SERVICES//$'\n'/, })" >&2
    exit 1
  fi
done

# ...and no prod service present.
for svc in "${PROD_SERVICES[@]}"; do
  if has_service "$SERVICES" "$svc"; then
    echo "refusing to run: prod service '$svc' present in resolved profile; refusing to touch prod" >&2
    exit 1
  fi
done

if [[ "$ASSUME_YES" != true ]]; then
  echo "about to DELETE containers, network and database volume of project '$PROJECT' (profile dev)"
  read -r -p "type 'dev-reset' to confirm: " answer
  [[ "$answer" == "dev-reset" ]] || { echo "aborted"; exit 1; }
fi

# NOTE: no --remove-orphans — dev and prod share the project name, and that flag
# could otherwise reach prod resources outside the active profile.
docker compose "${COMPOSE_FILES[@]}" --profile dev down --volumes
echo "dev stack '$PROJECT' (profile dev) removed"
