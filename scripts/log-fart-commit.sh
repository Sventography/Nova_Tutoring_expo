#!/usr/bin/env bash
set -e
scripts/log-fart.sh "$@"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || git init
git add FartAttackLog.md
git commit -m "Fart Attack Log: $(date '+%Y-%m-%d %H:%M:%S')" || true
