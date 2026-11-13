#!/usr/bin/env bash
set -euo pipefail

# --- Your backend API base (works fine) ---
export EXPO_PUBLIC_API_BASE="http://192.168.1.45:5055"

# --- Force a VALID single frontend URL for Expo’s CORS middleware ---
# (If web is running, 19006 is the usual; if you're not using web, this is still fine.)
export FRONTEND_URL="http://localhost:19006"
export APP_FRONTEND_URL="$FRONTEND_URL"

# --- Clean out any sneaky URL/CORS vars that might be blank or malformed ---
# (This prints what we’re unsetting so we can see culprits.)
while IFS='=' read -r key val; do
  if [[ "$key" =~ (URL|ORIGIN|CORS|FRONTEND) ]] && [[ "$key" != "EXPO_PUBLIC_API_BASE" ]] && [[ "$key" != "FRONTEND_URL" ]] && [[ "$key" != "APP_FRONTEND_URL" ]]; then
    echo "UNSET $key=$val"
    unset "$key" || true
  fi
done < <(env)

echo
echo "=== FINAL ENV GOING TO EXPO ==="
echo "EXPO_PUBLIC_API_BASE=$EXPO_PUBLIC_API_BASE"
echo "FRONTEND_URL=$FRONTEND_URL"
echo "APP_FRONTEND_URL=$APP_FRONTEND_URL"
echo "================================"
echo

# Start Expo in the SAME env
npx cross-env \
  EXPO_PUBLIC_API_BASE="$EXPO_PUBLIC_API_BASE" \
  FRONTEND_URL="$FRONTEND_URL" \
  APP_FRONTEND_URL="$APP_FRONTEND_URL" \
  expo start -c --host lan
