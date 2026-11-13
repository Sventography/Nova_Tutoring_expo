#!/usr/bin/env bash
set -euo pipefail
PM="npm"
command -v pnpm >/dev/null 2>&1 && PM="pnpm"
command -v yarn >/dev/null 2>&1 && PM="yarn"
if [ ! -f tsconfig.json ]; then
  npx tsc --init --jsx react-jsx --target ES2020 --module ESNext --skipLibCheck true --noEmit true >/dev/null 2>&1 || true
fi
case "$PM" in
  pnpm) pnpm add -D eslint @typescript-eslint/parser eslint-plugin-import prettier >/dev/null 2>&1 || true ;;
  yarn) yarn add -D eslint @typescript-eslint/parser eslint-plugin-import prettier >/dev/null 2>&1 || true ;;
  *) npm i -D eslint @typescript-eslint/parser eslint-plugin-import prettier >/dev/null 2>&1 || true ;;
esac
if [ ! -f .eslintrc.json ]; then
  cat > .eslintrc.json <<'JSON'
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["import"],
  "settings": { "import/resolver": { "typescript": {} } },
  "rules": { "import/no-unresolved": "error" }
}
JSON
fi
npx prettier -w "app/**/*.{ts,tsx}" >/dev/null 2>&1 || true
npx tsc -p tsconfig.json --noEmit
npx eslint "app/**/*.{ts,tsx}" --max-warnings=0
