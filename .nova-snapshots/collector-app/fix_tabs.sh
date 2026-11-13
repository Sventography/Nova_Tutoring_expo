#!/usr/bin/env bash
set -euo pipefail

# Enable globbing features if available (won't fail on zsh)
if command -v bash >/dev/null 2>&1; then
  shopt -s nullglob dotglob 2>/dev/null || true
fi

TABDIR="app/(tabs)"
NESTED="app/(tabs)/(tabs)"
AUTHDIR="app/(auth)"

echo "[Scan] Listing possible problem spots…"
# Safe scans (no ripgrep required)
find app -maxdepth 4 -print 2>/dev/null | grep -E "\(tabs\)|account|_layout" || true
grep -RIn --include='*.tsx' --include='*.ts' -e 'Tabs\.Screen' -e 'createBottomTabNavigator' -e "name=['\"]account['\"]" app 2>/dev/null || true

# 1) Flatten accidental nested tabs group
if [ -d "$NESTED" ]; then
  echo "[Fix] Flattening nested tabs group…"
  mkdir -p "$TABDIR"
  rsync -a "$NESTED/." "$TABDIR/" 2>/dev/null || cp -a "$NESTED/." "$TABDIR/"
  rm -rf "$NESTED"
fi

# 2) Ensure only one account tab file
echo "[Fix] Ensuring single account tab…"
mkdir -p "$TABDIR"
if [ -f "$TABDIR/account/index.tsx" ] && [ -f "$TABDIR/account.tsx" ]; then
  echo "[Fix] Removing duplicate: $TABDIR/account/index.tsx"
  rm -f "$TABDIR/account/index.tsx"
fi

# 3) Move auth screens OUT of tabs so they don't register as extra Tab screens
echo "[Fix] Moving auth screens to app/(auth)…"
mkdir -p "$AUTHDIR"
for f in register login forgot; do
  if [ -f "$TABDIR/$f.tsx" ]; then
    mv -f "$TABDIR/$f.tsx" "$AUTHDIR/$f.tsx"
  fi
  if [ -f "$TABDIR/account/$f.tsx" ]; then
    mv -f "$TABDIR/account/$f.tsx" "$AUTHDIR/$f.tsx"
  fi
done

echo "[OK] Structure normalized. Now create clean TSX files in Step B."
