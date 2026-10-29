#!/usr/bin/env bash
# Dedicated safe native iPhone collector staging build.
#
# Native ios/ is committed in this repo. Expo does NOT sync app.config's
# ios.bundleIdentifier or name into it during EAS build. Running plain
# eas build can therefore replace the installed production Nova app.
#
# Temporarily overlay the native Xcode bundle identity + iOS display/deep
# link settings, verify them, upload the correct working tree to EAS, then
# ALWAYS restore the exact original native files (even on interruption).
set -euo pipefail

# Free local preflight: verify all staged native and dynamic values without
# contacting Apple or submitting an EAS cloud build.
if [[ $# -gt 1 ]] || { [[ $# -eq 1 ]] && [[ "$1" != "--check-only" ]]; }; then
  echo "Usage: bash scripts/build-collector-staging-ios.sh [--check-only]"
  exit 2
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

EXPECTED_BRANCH="feature/noras-last-lantern-3d"
if [[ "$(git branch --show-current)" != "$EXPECTED_BRANCH" ]]; then
  echo "[collector-ios] REFUSING: use $EXPECTED_BRANCH only."
  exit 1
fi
if [[ ! -f ios/NovaTutoring.xcodeproj/project.pbxproj ||
      ! -f ios/NovaTutoring/Info.plist ]]; then
  echo "[collector-ios] REFUSING: missing expected original native project."
  exit 1
fi
if [[ -n "$(git status --porcelain -- ios/NovaTutoring.xcodeproj/project.pbxproj ios/NovaTutoring/Info.plist)" ]]; then
  echo "[collector-ios] STOP: native iOS files already have local edits."
  echo "[collector-ios] Nothing changed. Do not discard these edits."
  echo "[collector-ios] Run: git status --short -- ios/NovaTutoring.xcodeproj/project.pbxproj ios/NovaTutoring/Info.plist"
  exit 1
fi
if ! command -v node >/dev/null 2>&1 ||
   ! command -v npm >/dev/null 2>&1; then
  echo "[collector-ios] Node and npm are required."
  exit 1
fi

PROJECT="ios/NovaTutoring.xcodeproj/project.pbxproj"
PLIST="ios/NovaTutoring/Info.plist"
BACKUP_DIR="$(mktemp -d /tmp/nova-collector-ios.XXXXXX)"
cp "$PROJECT" "$BACKUP_DIR/project.pbxproj"
cp "$PLIST" "$BACKUP_DIR/Info.plist"

restore_native() {
  local code=$?
  trap - EXIT INT TERM
  if [[ -f "$BACKUP_DIR/project.pbxproj" && -f "$BACKUP_DIR/Info.plist" ]]; then
    cp "$BACKUP_DIR/project.pbxproj" "$PROJECT"
    cp "$BACKUP_DIR/Info.plist" "$PLIST"
  fi
  rm -rf "$BACKUP_DIR"
  echo "[collector-ios] Restored the original production native source files."
  if [[ $code -ne 0 ]]; then
    echo "[collector-ios] Build did not finish successfully. No native edits kept."
  fi
  exit "$code"
}
trap restore_native EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

node scripts/collector-staging-native-ios.cjs --apply
node scripts/collector-staging-native-ios.cjs --verify

# Verify dynamic Expo config AND actual native Xcode settings before EAS
# prepares Apple credentials. Never send a production-ID staging build.
export EXPO_NO_DOTENV=1
export EXPO_PUBLIC_COLLECTOR_STAGING_MODE=true
export EXPO_PUBLIC_COLLECTOR_REDEMPTION_ENABLED=true
export EXPO_PUBLIC_NORAS_LANTERN_PREVIEW=false
export EAS_BUILD_PROFILE=collector-staging-ios

npx expo config --json | node -e '
let s="";
process.stdin.on("data",c=>s+=c).on("end",()=>{
  const c=JSON.parse(s);
  const expected="com.sventography.novatutoring.ios.collectorstage";
  if(c.name!=="Nova Collector Staging" ||
     c.ios?.bundleIdentifier!==expected ||
     c.scheme!=="novacollectorstage") {
    console.error("[collector-ios] REFUSING: Expo config does not match native staging.");
    process.exitCode=1;
    return;
  }
  console.log("[collector-ios] Dynamic config and native Xcode agree.");
});'

if [[ $# -eq 1 && "$1" == "--check-only" ]]; then
  echo "[collector-ios] PRE-FLIGHT PASSED. No EAS build was started."
  echo "[collector-ios] Original native files will now be restored."
  exit 0
fi

echo
echo "=========================================================="
echo " NOVA COLLECTOR STAGING — SAFE iOS TEST BUILD"
echo " App display: Nova Collector Staging"
echo " Bundle ID:   com.sventography.novatutoring.ios.collectorstage"
echo " Deep link:   novacollectorstage"
echo " Branch:      $(git branch --show-current)"
echo " Production iOS native files: WILL BE RESTORED AUTOMATICALLY"
echo " Apple/EAS cloud build may count toward your plan usage."
echo " Verify this STAGING bundle ID in EAS before installation."
echo "=========================================================="
echo

# Expo's default VCS workflow uploads uncommitted working-tree files,
# including this temporary native overlay. Full Git requireCommit mode
# would upload only the previous native production files instead.
if grep -Eq '"requireCommit"[[:space:]]*:[[:space:]]*true' eas.json; then
  echo "[collector-ios] REFUSING: this repository requires clean commits."
  exit 1
fi

# Not a production/App Store submission. EXIT trap restores both native files.
npx eas-cli@latest build --platform ios --profile collector-staging-ios
