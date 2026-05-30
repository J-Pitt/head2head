#!/usr/bin/env bash
# Copy Upstash Redis vars from sibling truthordare app into head2head/.env.local
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SIBLING="$ROOT/../truthordare/.env.local"
HOME_COPY="$HOME/truthordare/.env.local"

if [[ -n "${TRUTHORDARE_ENV:-}" ]]; then
  SOURCE="$TRUTHORDARE_ENV"
elif [[ -f "$SIBLING" ]]; then
  SOURCE="$SIBLING"
elif [[ -f "$HOME_COPY" ]]; then
  SOURCE="$HOME_COPY"
else
  SOURCE="$SIBLING"
fi

TARGET="$ROOT/.env.local"

if [[ ! -f "$SOURCE" ]]; then
  echo "Source not found: $SOURCE"
  echo "Expected truthordare next to head2head:"
  echo "  $SIBLING"
  echo "Or set TRUTHORDARE_ENV to your .env.local path."
  exit 1
fi

url=$(grep -E '^UPSTASH_REDIS_REST_URL=' "$SOURCE" | head -1 || true)
token=$(grep -E '^UPSTASH_REDIS_REST_TOKEN=' "$SOURCE" | head -1 || true)

if [[ -z "$url" || -z "$token" ]]; then
  echo "Could not find UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN in $SOURCE"
  exit 1
fi

cat > "$TARGET" <<EOF
# Copied from $SOURCE — same Upstash DB, head2head: key prefix in Redis
$url
$token
EOF

echo "Wrote $TARGET (from $(basename "$(dirname "$SOURCE")")/.env.local)"
echo "Restart: npm run dev"
