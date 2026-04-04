#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -n "${MCP_DOCKER_COMPOSE_DIR:-}" ]]; then
  compose_dir="$MCP_DOCKER_COMPOSE_DIR"
elif [[ -f "$repo_root/docker-compose.yml" ]]; then
  compose_dir="$repo_root"
else
  echo "restart-mcp-docker: set MCP_DOCKER_COMPOSE_DIR in .env (see .env.example) or add docker-compose.yml at repo root." >&2
  exit 1
fi

cd "$compose_dir"
echo "Using compose directory: $compose_dir"
docker compose down
docker compose up -d --build
sleep 1
echo "--- logs (last 40 lines) ---"
docker compose logs --tail 40
