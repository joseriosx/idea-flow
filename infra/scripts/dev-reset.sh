#!/usr/bin/env bash
#
# Destroy the DEVELOPMENT stack, including its database volume.
#
# Safety: the script refuses to run unless the resolved compose project is the
# dev project, so it can never wipe the production database.
#
#   ./infra/scripts/dev-reset.sh              # ask before deleting
#   ./infra/scripts/dev-reset.sh --yes        # no prompt (CI / scripted)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILES=(-f compose.yaml -f compose.dev.yaml)
EXPECTED_PROJECT="idea-flow-dev"
ASSUME_YES=false

for arg in "$@"; do
  case "$arg" in
    --yes|-y) ASSUME_YES=true ;;
    --help|-h)
      sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
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

resolve_project() {
  local json
  json="$(docker compose "${COMPOSE_FILES[@]}" config --format json 2>/dev/null)" || return 1
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$json" | jq -r '.name // empty'
  else
    # tolerate pretty-printed JSON: "name": "idea-flow-dev"
    printf '%s' "$json" \
      | sed -n 's/^[[:space:]]*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
      | head -1
  fi
}

PROJECT="$(resolve_project || true)"

if [[ "$PROJECT" != "$EXPECTED_PROJECT" ]]; then
  echo "refusing to run: expected project '$EXPECTED_PROJECT', resolved '${PROJECT:-<unknown>}'" >&2
  exit 1
fi

if [[ "$ASSUME_YES" != true ]]; then
  echo "about to DELETE containers, network and database volume of project '$PROJECT'"
  read -r -p "type 'dev-reset' to confirm: " answer
  [[ "$answer" == "dev-reset" ]] || { echo "aborted"; exit 1; }
fi

docker compose "${COMPOSE_FILES[@]}" down --volumes --remove-orphans
echo "dev stack '$PROJECT' removed"
