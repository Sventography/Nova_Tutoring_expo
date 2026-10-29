# NOVA//ARCHIVE — Collector iPhone staging QA (no production rollout)

**Status:** Preparation only, not built or installed. 2026-10-29.
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
bash scripts/build-collector-staging-ios.sh
```

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

## Acceptance record

- [ ] All automated GitHub Actions jobs green on the exact feature branch commit
- [ ] Staging iPhone build installed alongside normal Nova
- [ ] On iPhone A owns #017, castle in Island inventory/render
- [ ] On iPhone B no #017 entitlement or castle
- [ ] A still owns #017 after switch, quit/restart
- [ ] BUILD gestures/pad work and castle does not obstruct Nova/quest
- [ ] Staging deep-link can open read-only owner verification
- [ ] Separate final HTTPS physical QR scan test completed (later)

**Never claim that mobile QR / fresh redemption passed on this evidence
alone.** No prod credentials, real QR stock, or App Store Connect
submission should be modified by this QA preparation.
