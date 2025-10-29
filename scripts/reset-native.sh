#!/usr/bin/env bash
set -euo pipefail

echo "▶ Stopping Expo if running..."
pkill -f "expo start" >/dev/null 2>&1 || true

echo "▶ Clearing watchman (ok if not installed)..."
watchman watch-del-all >/dev/null 2>&1 || true

echo "▶ Removing caches & builds..."
rm -rf node_modules .expo .expo-shared ios/build android/build
rm -rf "${TMPDIR:-/tmp}/metro-"* >/dev/null 2>&1 || true
rm -rf /tmp/metro-* >/dev/null 2>&1 || true

echo "▶ Reinstalling deps..."
npm install

echo "▶ Starting Expo (clean cache)..."
npx expo start -c
