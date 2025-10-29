#!/bin/bash
set -euo pipefail

API_BASE="http://192.168.1.45:5055"

# Debug log location
mkdir -p .nova_debug
DEBUG_ENV_FILE=".nova_debug/expo_env.$(date +%Y%m%d-%H%M%S).log"

# Minimal environment with API base injected
env -i \
  HOME="$HOME" \
  PATH="$PATH" \
  SHELL="$SHELL" \
  TMPDIR="${TMPDIR:-/tmp}" \
  TERM="${TERM:-xterm-256color}" \
  LANG="${LANG:-en_US.UTF-8}" \
  LC_ALL="${LC_ALL:-en_US.UTF-8}" \
  EXPO_NO_DOTENV=1 \
  EXPO_PUBLIC_API_BASE="$API_BASE" \
  /bin/sh -c '
    echo "ENV_LOG: $EXPO_PUBLIC_API_BASE"
    printenv | sort > "'"$DEBUG_ENV_FILE"'"
    npx expo start -c --host lan
  '
