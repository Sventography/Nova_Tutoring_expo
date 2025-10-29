#!/usr/bin/env bash
set -euo pipefail

# Always run from repo root
cd "$(dirname "$0")/.."

# Load .env safely (export all vars defined there)
if [ -f .env ]; then
  set -a
  . ./.env
  set +a
  echo "env: loaded .env"
fi

echo "env: exporting common vars (if present)"
export OPENAI_API_KEY="${OPENAI_API_KEY:-}"
export OPENAI_MODEL="${OPENAI_MODEL:-}"
export Google_API_KEY="${Google_API_KEY:-}"
export GOOGLE_CSE_ID="${GOOGLE_CSE_ID:-}"
export PORT="${PORT:-}"
export MONGODB_URI="${MONGODB_URI:-}"
export SESSION_SECRET="${SESSION_SECRET:-}"
export REDIS_URL="${REDIS_URL:-}"
export BASE_URL="${BASE_URL:-}"
export FRONTEND_URL="${FRONTEND_URL:-}"
export EMAIL_SERVICE="${EMAIL_SERVICE:-}"
export EMAIL_USER="${EMAIL_USER:-}"
export EMAIL_PASS="${EMAIL_PASS:-}"
export STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-}"
export STRIPE_PUBLISHABLE_KEY="${STRIPE_PUBLISHABLE_KEY:-}"
export STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-}"
export ANOTHER_API_KEY="${ANOTHER_API_KEY:-}"
export ANOTHER_SETTING="${ANOTHER_SETTING:-}"
export ANOTHER_SECRET="${ANOTHER_SECRET:-}"
export FEATURE_FLAG="${FEATURE_FLAG:-}"
export MAX_CONNECTIONS="${MAX_CONNECTIONS:-}"
export TIMEOUT="${TIMEOUT:-}"
export RETRY_ATTEMPTS="${RETRY_ATTEMPTS:-}"
export LOG_FILE_PATH="${LOG_FILE_PATH:-}"
export API_VERSION="${API_VERSION:-}"
export MAINTENANCE_MODE="${MAINTENANCE_MODE:-}"

echo "› Ensuring npm deps…"
npm install

echo "› Starting Expo (clear cache)…"
npx expo start -c
