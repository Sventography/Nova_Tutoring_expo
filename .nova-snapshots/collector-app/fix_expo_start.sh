#!/usr/bin/env bash
set -euo pipefail
set +H

# 1) Watchman config
echo {} > .watchmanconfig || true
watchman shutdown-server || true
watchman watch-del-all || true

# 2) NPM registry sanity and cache
npm config set registry https://registry.npmjs.org/
npm config delete proxy || true
npm config delete https-proxy || true
npm config delete noproxy || true
[ -f "$HOME/.npmrc" ] && mv "$HOME/.npmrc" "$HOME/.npmrc.bak" || true
[ -f ".npmrc" ] && mv ".npmrc" ".npmrc.bak" || true
npm cache clean --force
npm cache verify || true

# 3) Clean installs
rm -rf node_modules
rm -f package-lock.json

# Core SDK + RN + Web
npm install \
  expo@54.0.0 \
  react@19.1.0 \
  react-dom@19.1.0 \
  react-native@0.81.4 \
  react-native-web@0.21.0

# Expo router + native deps (pinned to doctor output)
npm install \
  expo-router@6.0.0 \
  react-native-reanimated@4.1.0 \
  react-native-gesture-handler@2.28.0 \
  react-native-screens@4.16.0 \
  react-native-safe-area-context@5.6.0

# Tooling
npm install -D \
  babel-preset-expo@54.0.0 \
  @babel/core@7.28.4 \
  typescript@5.9.2

# 4) Babel config with reanimated plugin LAST
cat > babel.config.js <<EOF
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [babel-preset-expo],
    plugins: [react-native-reanimated/plugin],
  };
};
EOF

# 5) Clear Expo/Metro caches
rm -rf .expo
rm -rf .expo-shared
rm -rf node_modules/.cache || true
rm -rf /tmp/metro-* || true
rm -rf /tmp/haste-map-* || true

# 6) Quick diag
npx expo --version || true
npx expo doctor || true

# 7) Start (no extra NODE_OPTIONS)
EXPO_NO_TELEMETRY=1 EXPO_DEBUG=1 npx expo start -c
