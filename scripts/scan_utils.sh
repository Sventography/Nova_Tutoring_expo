#!/usr/bin/env bash
set -e
mods=$(grep -Rho --include="*.ts" --include="*.tsx" -E "from[[:space:]]*['\"][^'\"]*(_?utils\/[A-Za-z0-9_-]+)" app 2>/dev/null | sed -E 's/.*_?utils\/([A-Za-z0-9_-]+).*/\1/' | sort -u)
for m in $mods; do
  ./scripts/gen_stub.sh "$m"
done
