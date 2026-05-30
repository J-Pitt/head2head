#!/usr/bin/env bash
# Copy Upstash Redis vars from an existing .env.local into head2head/.env.local.
# Usage:
#   ./scripts/setup-env.sh /path/to/other/.env.local
#   SOURCE_ENV=/path/to/other/.env.local npm run setup:env
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

SOURCE="${1:-${SOURCE_ENV:-}}"
TARGET="$ROOT/.env.local"

if [[ -z "$SOURCE" ]]; then
  echo "No source .env.local given."
  echo "Usage: ./scripts/setup-env.sh /path/to/other/.env.local"
  echo "   or: SOURCE_ENV=/path/to/other/.env.local npm run setup:env"
  echo "Or just: cp env.example .env.local  (then fill in your credentials)"
  exit 1
fi

if [[ ! -f "$SOURCE" ]]; then
  echo "Source not found: $SOURCE"
  exit 1
fi

url=$(grep -E '^UPSTASH_REDIS_REST_URL=' "$SOURCE" | head -1 || true)
token=$(grep -E '^UPSTASH_REDIS_REST_TOKEN=' "$SOURCE" | head -1 || true)

if [[ -z "$url" || -z "$token" ]]; then
  echo "Could not find UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN in $SOURCE"
  exit 1
fi

cat > "$TARGET" <<EOF
# Upstash Redis — head2head: key prefix in Redis
$url
$token
EOF

echo "Wrote $TARGET"
echo "Restart: npm run dev"
