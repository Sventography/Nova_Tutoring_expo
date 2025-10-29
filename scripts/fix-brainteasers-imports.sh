#!/usr/bin/env bash
set -euo pipefail

F="app/(tabs)/brainteasers.tsx"
test -f "$F" || F="app/tabs/brainteasers.tsx"   # fallback if you keep it under /tabs
if [ ! -f "$F" ]; then
  echo "❌ Could not find brainteasers.tsx under app/(tabs) or app/tabs"
  exit 1
fi

echo "▶ Using file: $F"

# helper: set import path if file exists
set_path () {
  local varname="$1" ; shift
  for cand in "$@"; do
    if [ -f "$cand.tsx" ] || [ -f "$cand.ts" ] || [ -f "$cand.js" ] || [ -f "$cand.jsx" ]; then
      printf "%s=%s\n" "$varname" "$cand"
      return 0
    fi
  done
  return 1
}

# try common provider/context filenames
COINS=""
TOAST=""
ACHIEVE=""

set_path COINS   "app/context/CoinsContext" "app/context/CoinsProvider" "app/providers/CoinsProvider" || true
set_path TOAST   "app/context/ToastContext" "app/context/ToastProvider" "app/providers/ToastProvider" || true
set_path ACHIEVE "app/context/AchievementsContext" "app/context/AchievementsProvider" "app/providers/AchievementsProvider" || true

# compute relative path from the brainteasers file dir to each target
BT_DIR="$(dirname "$F")"
relpath () { python3 - <<PY
import os,sys
print(os.path.relpath(sys.argv[1], sys.argv[2]))
PY
}

patch_one () {
  local sym="$1" target="$2"
  [ -n "$target" ] || { echo "⚠ $sym not found — leaving as-is"; return; }
  local rp="./$(relpath "$target" "$BT_DIR")"
  # drop extension in import
  rp="\${rp%.tsx}"; rp="\${rp%.ts}"; rp="\${rp%.js}"; rp="\${rp%.jsx}"
  echo "▶ Patching $sym -> $rp"
  # replace any previous wrong path
  sed -i '' "s#\\./providers/$sym#${rp}#g; s#\\../providers/$sym#${rp}#g; s#\\./context/$sym#${rp}#g; s#\\../context/$sym#${rp}#g" "$F"
  sed -i '' "s#['\"]/providers/${sym}Provider['\"]#'${rp}'#g; s#['\"]/context/${sym}Provider['\"]#'${rp}'#g" "$F"
  # replace specific Provider/Context names
  sed -i '' "s#['\"]/providers/${sym}Context['\"]#'${rp}'#g; s#['\"]/context/${sym}Context['\"]#'${rp}'#g" "$F"
}

patch_one "CoinsProvider" "$COINS"
patch_one "ToastProvider" "$TOAST"
patch_one "AchievementsProvider" "$ACHIEVE"
# also handle direct context names
patch_one "CoinsContext" "$COINS"
patch_one "ToastContext" "$TOAST"
patch_one "AchievementsContext" "$ACHIEVE"

echo "✅ Imports patched (where files were found)."
