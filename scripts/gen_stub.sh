#!/usr/bin/env bash
set -e
mod="$1"
file="app/_utils/${mod}.ts"
mkdir -p app/_utils
names=$(grep -RIn --include="*.ts" --include="*.tsx" -E "from[[:space:]]*['\"][^'\"]*(_?utils\/${mod}|@\/_?utils\/${mod})['\"]" app 2>/dev/null | sed -n 's/.*import[[:space:]]*{[[:space:]]*\([^}]*\)}.*/\1/p' | tr ',' '\n' | sed 's/as[[:space:]][^,]*//; s/[[:space:]]//g' | sort -u | grep -v '^$' || true)
{
  echo 'type AnyFn = (...args: any[]) => any;'
  echo 'const __noop: AnyFn = async (..._args: any[]) => undefined;'
  echo 'const api: Record<string, AnyFn> = new Proxy({}, { get: () => __noop });'
  echo 'export default api;'
  if [ -n "$names" ]; then
    for n in $names; do
      echo "export const $n: AnyFn = __noop;"
    done
  fi
} > "$file"
echo "stubbed $file"
