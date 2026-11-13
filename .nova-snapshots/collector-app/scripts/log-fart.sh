#!/usr/bin/env bash
set -e
FILE="FartAttackLog.md"
[ -f "$FILE" ] || echo "# 💨 Fart Attack Log ™" > "$FILE"
LASTNUM=$(grep -Eo '^## Bug #[0-9]+' "$FILE" | awk '{print $3}' | tr -d '#' | tail -n1)
if [ -z "$LASTNUM" ]; then NEXT=1; else NEXT=$((LASTNUM+1)); fi
BUG="${1:-Unnamed bug}"
ATTACK_INPUT="${2:-}"
POWER_INPUT="${3:-}"
RESULT="${4:-Bug obliterated by stink storm}"
WHEN="$(date '+%Y-%m-%d %H:%M:%S')"
attacks=("Double Butt Press Blaster" "Synchronized Dutch Oven" "Mushroom Cloud Combo" "Thunder Cheek Slam" "Turbo Toot Chain" "Cheek-to-Cheek Overload" "Pressure Cooker Pop" "Wind Tunnel Wipeout" "Nuclear Stink Surge" "Toxic Tuba Solo")
if [ -z "$ATTACK_INPUT" ]; then ATTACK="${attacks[$((RANDOM % ${#attacks[@]}))]}"; else ATTACK="$ATTACK_INPUT"; fi
if [ -z "$POWER_INPUT" ]; then POWER=$(awk 'BEGIN{srand(); printf "%.1f", 7+rand()*3}'); else POWER="$POWER_INPUT"; fi
{
  echo ""
  echo "## Bug #$NEXT: $BUG"
  echo "- **Attack Used:** $ATTACK"
  echo "- **Blast Power:** $POWER"
  echo "- **Result:** $RESULT"
  echo "- **When:** $WHEN"
} >> "$FILE"
echo "Logged Bug #$NEXT → $FILE"
