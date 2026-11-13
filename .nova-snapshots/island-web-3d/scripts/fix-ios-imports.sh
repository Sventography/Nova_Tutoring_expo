#!/usr/bin/env bash
set -euo pipefail

echo "▶ Checking expo-linear-gradient imports…"
# Rewrite any default imports to the correct named import:
#   import LinearGradient from 'expo-linear-gradient'
# → import { LinearGradient } from 'expo-linear-gradient'
rg -n "import[[:space:]]+LinearGradient[[:space:]]+from[[:space:]]+['\"]expo-linear-gradient['\"]" app || true
rg -l "import[[:space:]]+LinearGradient[[:space:]]+from[[:space:]]+['\"]expo-linear-gradient['\"]" app \
  | xargs -I{} gsed -i "s/import[[:space:]]\+LinearGradient[[:space:]]\+from[[:space:]]\+'expo-linear-gradient'/import { LinearGradient } from 'expo-linear-gradient'/g" {} 2>/dev/null || true
# BSD sed fallback
rg -l "import[[:space:]]+LinearGradient[[:space:]]+from[[:space:]]+['\"]expo-linear-gradient['\"]" app \
  | xargs -I{} sed -i '' "s/import[[:space:]]\+LinearGradient[[:space:]]\+from[[:space:]]\+'expo-linear-gradient'/import { LinearGradient } from 'expo-linear-gradient'/g" {} 2>/dev/null || true

echo "▶ Finding files that use S.* but might not declare styles…"
# List files that reference S.something
FILES_WITH_S=$(rg -l "\bS\.[A-Za-z0-9_]+\b" app || true)
echo "$FILES_WITH_S" | sed 's/^/  • /'

echo "▶ Among those, highlight any that do NOT declare StyleSheet.create"
for f in $FILES_WITH_S; do
  if ! rg -q "StyleSheet\.create\(" "$f"; then
    echo "  ⚠ $f uses S.* but has no StyleSheet.create — please add const S = StyleSheet.create({...})"
  fi
done

echo "▶ Checking duplicate constant declarations in quiz files (CYAN/BLUE/BLACK/S)…"
for NAME in CYAN BLUE BLACK; do
  rg -n "const[[:space:]]+$NAME[[:space:]]*=" app | sed "s/^/  • /" || true
done

# Optional: automatically comment duplicate CYAN declarations in the dynamic quiz file
F="app/(tabs)/quiz/[topic].tsx"
if [ -f "$F" ]; then
  awk 'BEGIN{c=0} {if($0 ~ /const[[:space:]]+CYAN[[:space:]]*=/){c++; if(c>1){print "// " $0; next}} print }' "$F" > "$F.tmp" && mv "$F.tmp" "$F"
fi
F2="app/tabs/quiz.tsx"
if [ -f "$F2" ]; then
  awk 'BEGIN{c=0} {if($0 ~ /const[[:space:]]+CYAN[[:space:]]*=/){c++; if(c>1){print "// " $0; next}} print }' "$F2" > "$F2.tmp" && mv "$F2.tmp" "$F2"
fi

echo "▶ Ensuring expo-linear-gradient is installed…"
npx expo install expo-linear-gradient

echo "▶ Clearing caches and restarting Expo clean…"
watchman watch-del-all >/dev/null 2>&1 || true
rm -rf .expo .expo-shared node_modules/.cache ios/build android/build
rm -rf \"${TMPDIR:-/tmp}\"/metro-* >/dev/null 2>&1 || true
npm install
npx expo start -c
