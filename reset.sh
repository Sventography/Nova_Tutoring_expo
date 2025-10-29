#!/usr/bin/env bash
set -euo pipefail

echo "🔧 Nova Reset — Clean reinstall for Expo SDK 51 baseline"

# 1) Show Node version (recommend 18 or 20)
node -v || true
echo "ℹ️ If Node <18, consider switching (nvm use 20)."

# 2) Stop any running Expo (in other terminals) before running this script.

# 3) Remove installs & locks
echo "🧹 Removing node_modules and lockfile…"
rm -rf node_modules package-lock.json

# 4) Clean npm caches (fixes random ENOENT/tar errors)
echo "🧽 Cleaning npm cache…"
npm cache clean --force || true
rm -rf "$HOME/.npm/_cacache" "$HOME/.npm/_logs" "$HOME/.npm/_npx" 2>/dev/null || true
rm -rf "$HOME/.cache/node-gyp" 2>/dev/null || true

# 5) Fresh install
echo "📦 npm install…"
npm install

# 6) Ensure key Expo deps (idempotent, pins correct versions for your SDK)
echo "🧩 Ensuring Expo packages are aligned…"
npx expo install expo-router expo-linear-gradient react-native

# 7) Optional: remove stale Expo caches
echo "🧯 Clearing Expo/Metro caches…"
rm -rf .expo .expo-shared 2>/dev/null || true

# 8) Start with clean cache
echo "🚀 Starting Expo with clean cache…"
npx expo start -c
