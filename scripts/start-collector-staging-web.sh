#!/usr/bin/env bash
# NOVA//ARCHIVE collector-staging-only Expo launcher.
# This project-specific publishable API key is intentionally PUBLIC.
# Never use a Supabase secret, service_role, or live Nova API key here.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

BRANCH="$(git branch --show-current)"
if [[ "$BRANCH" != "feature/noras-last-lantern-3d" ]]; then
  echo "[collector-staging] REFUSING: checkout feature/noras-last-lantern-3d first."
  echo "Current branch: $BRANCH"
  exit 1
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "[collector-staging] Node.js and npm are required."
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "[collector-staging] Installing project dependencies from package-lock.json..."
  npm ci
fi

# Don't allow Expo to silently change to port 8082 (or another port):
# the staging Edge CORS allowlist intentionally permits only port 8081.
if command -v lsof >/dev/null 2>&1 &&
    lsof -nP -iTCP:8081 -sTCP:LISTEN 2>/dev/null | grep -q LISTEN; then
  echo "[collector-staging] Port 8081 is already in use."
  echo "Stop the other Expo dev server (Ctrl+C), then run this script again."
  exit 1
fi

# Load ONLY the explicit staging variables below. Expo otherwise loads
# old .env / .env.local production values on this Mac and can inline them
# into the browser despite the staging flag.
export EXPO_NO_DOTENV=1

# Override any existing/live .env values in this process only, without
# editing or overwriting the user's normal local configuration.
export EXPO_PUBLIC_COLLECTOR_STAGING_MODE=true
export EXPO_PUBLIC_COLLECTOR_REDEMPTION_ENABLED=true
export EXPO_PUBLIC_SUPABASE_URL="https://gouhhltupxaycuysdtrw.supabase.co"
export EXPO_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_g6o0Crn4Cn_r5vj6RMn3SQ_1K_q0SDY"
export EXPO_PUBLIC_BACKEND_URL="https://gouhhltupxaycuysdtrw.supabase.co"

# The Expo web app must use the same port whitelisted by the staging Edge
# function's CORS policy. Use only a localhost browser for this real-login test.
echo
echo "============================================================"
echo "  NOVA//ARCHIVE — REAL ACCOUNT STAGING (NOT PRODUCTION)"
echo "  Auth:    nova-collector-staging (new separate Supabase)"
echo "  Backend: staging Supabase Edge Function"
echo "  Local .env loading: DISABLED for this staging run"
echo "  Browser: http://localhost:8081/sign-in"
echo "  Debug:   http://localhost:8081/collector-staging"
echo "  PLEASE USE STAGING TEST ACCOUNTS, NOT YOUR LIVE NOVA LOGIN."
echo "  Press Ctrl+C to stop; this does NOT erase account-owned rewards."
echo "============================================================"
echo

# --port is deliberate: Edge CORS permits only localhost:8081/19006.
exec npx expo start --web -c --port 8081
