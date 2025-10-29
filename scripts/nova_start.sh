#!/usr/bin/env bash
set -euo pipefail
export EXPO_NO_TELEMETRY=1
export EXPO_DEBUG=1
# Load the URL shim if present (prevents "TypeError: Invalid URL")
[ -f "$(pwd)/url_shim.js" ] && export NODE_OPTIONS="--require $(pwd)/url_shim.js" || true
# Clean minor caches to avoid stale favicon or routing weirdness
rm -rf .expo node_modules/.cache 2>/dev/null || true
npx expo start -c
