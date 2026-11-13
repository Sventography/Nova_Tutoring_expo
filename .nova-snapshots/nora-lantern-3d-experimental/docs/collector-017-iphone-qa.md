# NOVA//ARCHIVE — Collector iPhone staging QA (no production rollout)

**Status:** Installed and manually tested on iPhone, user-confirmed 2026-10-31.
See the dated acceptance update below; earlier setup sections are historical instructions.
**Project:** Feature branch `feature/noras-last-lantern-3d`.
**Backend:** ONLY isolated `nova-collector-staging` Supabase project.
**Accounts:** Tester A / Tester B already confirmed in staging.

## Why a separate development build?

Nova uses Expo SDK 54, `expo-dev-client`, `expo-iap` and custom
native libraries. Expo Go is not a reliable test of the real app because
native IAP modules require a development build. A production TestFlight
build is **not** staging and must never be used to attempt these tests.

To keep this harmless to the published iPhone app:
- `eas.json` contains a dedicated **collector-staging-ios** build
  profile with staging-only env flags.
- `app.config.js` in that mode uses **Nova Collector Staging**,
  iOS bundle ID `com.sventography.novatutoring.ios.collectorstage`,
  and URL scheme `novacollectorstage://`.
- Normal Nova retains bundle ID
  `com.sventography.novatutoring.ios` and scheme `nova://`.
- App config refuses a staging iPhone profile without staging mode,
  or staging mode used with a normal EAS production/development profile.
- The staged Auth/Edge URL and client-side public API key are pinned
  to the isolated staging project; the real Render and prod Supabase
  are not the collector stage backends.
- The stage runner disables local dotenv and developer fake-castle preview.

The iPhone staging app is not published. Building/installing it
requires the owner's Expo, Apple developer/provisioning and EAS access.

## Step 1 — Run automated CI checks first

Visit the **Collector 017 security and app checks** GitHub Actions
workflow for the repo. Click **Run workflow**, choose
`feature/noras-last-lantern-3d`, then the green Run workflow button.

This manual-only workflow performs:
1. Python collector backend unit tests (ownership and security).
2. Stage-config and per-project session isolation checks.
3. iPhone staging build identifier and fail-closed config checks.
4. #017 placement, quest and Nova collision-migration checks.
5. BUILD camera pan/orbit regression tests.
6. TypeScript diagnostics scoped to collector-modified files.
7. Static Expo web export with dummy public credentials (not a deploy).

Only call the suite passed if every required job has a green check.
An Expo export is not a real auth flow or iPhone app test.

## Step 2 — Install a separate staging development build on iPhone

**Do not install over normal Nova**, or use the main TestFlight app.

From the Mac's working feature-branch repo, stop the current web Expo
server (Ctrl+C) and fetch/fast-forward the branch. Then sign in to the
intended EAS project and Apple's developer provisioning when prompted.

IMPORTANT native identity correction, following the owner's first
iPhone attempt: The repository **tracks ios/**. Xcode's
`ios/NovaTutoring.xcodeproj/project.pbxproj` has the normal Nova
bundle ID in both Debug and Release configurations, and its
`ios/NovaTutoring/Info.plist` has the normal Nova display name
and URL scheme. In this existing native project EAS **does not copy**
the dynamic `app.config.js` name/bundle ID into Xcode. Therefore,
even though `npx expo config --json` correctly prints the *staging*
name, a direct `eas build --profile collector-staging-ios`
could still create an IPA with the **normal Nova** bundle ID and
install it over the regular app. This happened on the first test.

**DO NOT run the raw EAS build command again.** Use the staging-safe
wrapper, which temporarily patches only those native source identity
values and checks both native and dynamic config before invoking EAS.
It backs up the existing Xcode project and Info.plist, and restores
them automatically on success, failure, or interruption. It refuses
to proceed if the tracked native files already have local changes.

```bash
cd ~/dev/Nova_Tutoring_expo_3
git -c core.sshCommand="ssh -p 443 -o Hostname=ssh.github.com" fetch origin
git merge --ff-only origin/feature/noras-last-lantern-3d
bash scripts/build-collector-staging-ios.sh --check-only
# Only after it prints PRE-FLIGHT PASSED and restores the native files:
bash scripts/build-collector-staging-ios.sh
```

The `--check-only` mode does **not** contact EAS or consume a
cloud build. It verifies that Xcode, Info.plist and the dynamic Expo
configuration all identify **Nova Collector Staging**, then restores
the original native files. Review the output before launching another
cloud build, especially after an earlier wrong-ID installation.

Before any installation, check the resulting EAS build's **actual
native iOS bundle identifier**: it MUST be
`com.sventography.novatutoring.ios.collectorstage`. If EAS still
shows `com.sventography.novatutoring.ios`, stop: that is a normal
Nova build, not the collector staging app.

Do not run another cloud build just to check the config: run
`node scripts/test-collector-staging-native-ios.cjs` first or
run the manual GitHub test workflow. Those tests use a disposable
Xcode copy and change nothing in the real iOS files.

For EAS internal-distribution development builds on a real iPhone,
follow the EAS prompt to register the iPhone for ad-hoc provisioning
**before** building if it is not already on the provisioning list.
The owner must complete Apple/EAS authentication and install the
resulting **Nova Collector Staging** app using the EAS install URL.
The app must remain separate from the normal Nova app.

If remote EAS builds would be chargeable, check the user's EAS
build limits before triggering. This repository change does NOT
start a build.

## Step 3 — Serve the staging JS bundle to the iPhone

Ensure Mac and iPhone are on the same **trusted Wi-Fi**. No public
tunneling, no port forwarding and no staging QR codes in source.

On the Mac, with the feature branch already updated:

```bash
bash scripts/start-collector-staging-ios.sh
```

The launcher:
- checks the branch and BUILD v3 marker;
- disables dotenv and pins staging Supabase Auth/Edge;
- refuses if port 8081 is already in use;
- runs Metro `--dev-client --lan` at 8081.

Open the **Nova Collector Staging** app on the iPhone. It should
connect to the developer server. If the Metro server is inaccessible,
check macOS local-network firewall permissions and that both devices
use the same Wi-Fi. Do NOT work around this by exposing the real
staging Auth bearer token over a plaintext browser LAN website.

## Step 4 — Real staging account/entitlement check on iPhone

1. Sign in with the **staging Tester A** login, not the normal account.
2. Open the `collector-staging` diagnostic route using the app's
   Router/deep-link navigation, and refresh entitlements.
3. Expect server #017 entitlement **confirmed**, Island owned count
   **1**, castle visible on Island.
4. Use BUILD camera touch rotate/pan/zoom and the on-screen camera pad.
5. Log out, sign in as **Tester B**, recheck: **no #017 entitlement
   or castle**. Switch back to A and confirm persistence.

Don't attempt to redeem #017 again: the one-time staging serial is
permanently claimed. The unclaimed #023 code has NO castle reward and
must not award one. Save any custom island layout before logging out.

## Step 5 — Native deep-link / physical QR boundary

The already-claimed staging code can be used for a **read-only
verification** deep-link on Tester A, not another claim. Once the
native staging app is installed, a dev/test link looks like:

```
novacollectorstage://collector?code=<YOUR_EXISTING_STAGING_CODE>
```

The exact link handler on a physical iPhone must be tested from a
tappable link (e.g., a local Notes link); raw typing into Safari may
not dispatch custom schemes. **Do not put secret QR tokens in a
public notes app, third-party shortener, GitHub file or email.**
For a real physical QR scan, final packaging needs a hosted HTTPS
authenticity page unlinked from the public website, handing off
to the installed app through an appropriate deep/universal link.
Scanning the Expo Metro QR opens a dev session; it is NOT evidence
that the real collector hang-tag QR scan path works.

This staged development client verifies native entitlement,
account separation and island controls. A full physical printed-tag
scan and a fresh single-use #017 claim require a later production-like
HTTPS QR bridge and a separately prepared disposable test entitlement.
Do not use real manufactured serials during testing.

## iPhone Metro loading follow-up (2026-10-31)

The correct separate iPhone development client installed and opened its
launcher, but showed "No development servers found", then "Error loading
app" when connecting to the Mac. On the same Wi-Fi, the iPhone (LAN
192.168.1.67) successfully opened/downloaded
`http://192.168.1.74:8081/status` using Safari. From the Mac itself,
the same LAN Metro endpoint returned `packager-status:running`, the
iOS development manifest returned HTTP 200, and the manifest's iOS JS
bundle returned HTTP 200 with 26,475,173 bytes.

These results confirm Metro can produce the app bundle and Safari can
reach it, **but do not prove the native iPhone app has permission to
connect to the LAN**. Apple explicitly exempts Safari/WKWebView from
the native Local Network permission gate. The tracked
`ios/NovaTutoring/Info.plist` previously declared
`NSAllowsLocalNetworking` (ATS HTTP policy), but did NOT declare
`NSLocalNetworkUsageDescription` or `NSBonjourServices` (local
network privilege/Expo discovery). The user also reported
Nova Collector Staging was absent from iOS Settings > Privacy &
Security > Local Network.

To address this, the **temporary staging-native overlay only** now
adds:
- `NSLocalNetworkUsageDescription`: why the staging app uses LAN Metro
- `NSBonjourServices`: `_expo._tcp` for dev-server discovery

The app's production plist and native identifiers remain untouched.
The overlay's existing `--check-only` path verifies these fields
and restores the production files. The staging-only regression test
now requires these privacy declarations and verifies they do not
persist in the production plist.

**Diagnosis status:** This is a concrete missing iOS privacy
declaration and plausible explanation for failure, **not proven root
cause** without native device logs or a retest. Existing installed
iPhone binaries cannot acquire new Info.plist declarations via
Metro JS refresh; they require another signed native staging build.
Because EAS builds may be billable, first run:

```bash
git -c core.sshCommand="ssh -p 443 -o Hostname=ssh.github.com" fetch origin
git merge --ff-only origin/feature/noras-last-lantern-3d
node scripts/test-collector-staging-native-ios.cjs
bash scripts/build-collector-staging-ios.sh --check-only
```

Review the output and (ideally) rerun the manual GitHub workflow.
If a new EAS build is authorized, invoke only
`bash scripts/build-collector-staging-ios.sh` and replace the
**staging app** using its new EAS install link, never the published
Nova app. The next load should produce a native Local Network
permission prompt; tap Allow, then reopen the LAN Metro URL.
If it still fails, inspect native device Console logs
(e.g. `NSURLErrorDomain`, `App Transport Security`,
`Local Network`) before any further build.

## Acceptance record

- [ ] All automated GitHub Actions jobs green on the exact feature branch commit
- [x] Separate Nova Collector Staging app installed (user confirmed app identity)
- [x] Owning account has #017 castle in inventory and can place it on iPhone
- [x] Tester B has no castle in inventory/Island (user-reported account-switch check)
- [x] Owning account retains castle and saved placement after switch and restart (user reported)
- [ ] BUILD gestures/pad work and castle does not obstruct Nova/quest
- [ ] Staging deep-link can open read-only owner verification
- [ ] Separate final HTTPS physical QR scan test completed (later)

**Never claim that mobile QR / fresh redemption passed on this evidence
alone.** No prod credentials, real QR stock, or App Store Connect
submission should be modified by this QA preparation.

## Acceptance update — 2026-10-31

User confirmed Nova Collector Staging opened through the tunnel, castle
inventory/placement works, and the restart/account-switch sequence passed.
The suspected library overlap was resolved by the user; no placement defect
was established. These manual checks need not be repeated without a relevant
change. This report is user evidence, not an independently observed device log.

The screenshot exposed PGRST202 for nova_mark_daily_streak. Collector staging
provides collector Auth/ownership, not the normal Nova economy. The client now
skips streak status/claim RPCs in collector staging and returns a non-awarding
result; the header also catches claim failures. No economy schema or live
backend is changed. Device confirmation of this JS fix remains pending.

Latest verified GitHub Actions run: 40933281673, SUCCESS on 2026-10-29,
commit 359a6ac4f917c06cb135cd0a35e18fea82a77d62:
https://github.com/Sventography/Nova_Tutoring_expo/actions/runs/40933281673
This is older than the current native identity/network changes and streak fix.
It must not be represented as green CI for the current working tree.

Release handoff: preserve the completed manual checks; obtain current-commit
CI before merging/releasing, review production deployment configuration and
fulfillment/code handling, then deliberately coordinate production activation.
Prior QR test records are historical evidence. A shipped HTTPS physical QR
handoff is not established by today's inventory/account checks; this is an
unresolved evidence boundary, not a request to redo the earlier claim tests.

Local validation of the 2026-10-31 working-tree update:
- Six JavaScript regression scripts passed: staging config (50 assertions),
  iOS build config, native overlay/restore, castle placement, BUILD camera,
  and the new staging streak regression (staging makes zero economy calls;
  normal Nova still calls server RPCs and propagates errors).
- All 26 Python collector backend tests passed using the CI dependencies in
  a temporary virtual environment; no database or user accounts were changed.
- Full tsc stops on TS2657 in an existing backups/ history.tsx file. A separate
  check rooted at StreakContext/HeaderBar found no diagnostics in those two
  changed files, but 33 diagnostics in imported dependencies. This is NOT
  a clean full-project typecheck. CI's existing touched-file filter does not
  establish full type safety when backup syntax errors stop compilation.
- Real authenticated staging redemption and inventory sync were already
  recorded on 2026-10-29 in collector-017-real-auth-staging.md. Do not redo
  those just because an older pending-steps section remains in the history.
- Expo static web export passed (exit 0) using dotenv-disabled CI-style
  configuration, with output in /tmp/nova-collector-release-web. This is
  a local export, not a hosted preview or production deployment.

Working-tree fix and workflow edits remain local, uncommitted/unpushed.
Current-commit GitHub CI still needs a run after these changes are committed.
