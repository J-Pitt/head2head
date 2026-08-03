#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
PORT="${PORT:-3000}"
STARTED_SERVER=0
SERVER_PID=""

cleanup() {
  if [[ "$STARTED_SERVER" -eq 1 && -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

server_up() {
  curl -sf -o /dev/null "$BASE_URL" || curl -sf -o /dev/null "$BASE_URL/api/head2head/room/status"
}

if ! server_up; then
  echo "Starting Next.js on port ${PORT}..."
  npm run dev -- --port "$PORT" --hostname 127.0.0.1 > /tmp/head2head-e2e-server.log 2>&1 &
  SERVER_PID=$!
  STARTED_SERVER=1

  for i in $(seq 1 60); do
    if server_up; then
      echo "Server ready."
      break
    fi
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
      echo "Server exited early. Log:"
      cat /tmp/head2head-e2e-server.log
      exit 1
    fi
    sleep 1
    if [[ "$i" -eq 60 ]]; then
      echo "Timed out waiting for server. Log:"
      cat /tmp/head2head-e2e-server.log
      exit 1
    fi
  done
else
  echo "Using existing server at $BASE_URL"
fi

export BASE_URL
npx mocha "$@"
