#!/usr/bin/env bash
# NOVA//ARCHIVE dedicated iPhone native development-client launcher.
# Use ONLY with the separate Nova Collector Staging iOS dev build.
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

# Prevent testing an outdated bundle that lacks the BUILD-mode camera.
if ! grep -Fq 'MOVE CAMERA · BUILD v3' app/components/island3d/NovaIsland3DScene.tsx; then
  echo "[collector-staging] This branch checkout does NOT include BUILD v3."
  echo "Fetch and fast-forward origin/feature/noras-last-lantern-3d first."
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

# Don't allow a second Metro process or a web test to silently take port 8081.
# Native device HTTPS calls to staging Supabase do not rely on browser CORS.
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

# A leftover Lantern developer-preview flag can render a separate fake
# castle in staging and confuse real #017 ownership/placement testing.
# Staging uses ONLY the actual authenticated collector inventory.
unset EXPO_PUBLIC_NORAS_LANTERN_PREVIEW
unset EXPO_PUBLIC_NORAS_LANTERN_X
unset EXPO_PUBLIC_NORAS_LANTERN_Z

# The dev-client reads its Metro JS bundle from the Mac over local Wi-Fi.
# Supabase Auth and Collector traffic still go to the isolated HTTPS project.
# This script does not install an app or generate any physical collector QR.
echo
echo "============================================================"
echo "  NOVA//ARCHIVE — REAL ACCOUNT STAGING (NOT PRODUCTION)"
echo "  Git commit: $(git rev-parse --short HEAD)"
echo "  Island camera: MOVE CAMERA · BUILD v3"
echo "  Auth:    nova-collector-staging (new separate Supabase)"
echo "  Backend: staging Supabase Edge Function"
echo "  Local .env loading: DISABLED for this staging run"
echo "  Device: iPhone with the separate Nova Collector Staging dev build"
echo "  Device route: collector-staging inside that staging app"
echo "  Use staging Tester A/B accounts ONLY. Never use live Nova login."
echo "  Press Ctrl+C to stop; this does NOT erase account-owned rewards."
echo "============================================================"
echo

# --dev-client forces a proper native build (expo-iap is not part of Expo Go).
# Both devices must be on the same trusted Wi-Fi network.
exec npx expo start --dev-client --lan -c --port 8081
