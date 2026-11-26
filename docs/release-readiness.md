# Nova Tutoring release checklist

Use one reviewed Git SHA across the preview, QA record and candidate binaries. Record the build ID, environment, platform, OS/device and result beside each completed check. A JavaScript export establishes that bundling works. It does not compile a native binary or exercise login, StoreKit, Play Billing, hardware audio or a device GPU.

## Candidate and environment

- [ ] Confirm the exact heads of PRs #7, #9, #10, #12, #14 and #15 against the integration commit. Check issue #11 for changes since the freeze. Review overlapping paths and database/client contracts.
- [ ] On a clean checkout run the project's JS regressions, Python server tests, TypeScript and Expo exports for web, iOS and Android. Compare TypeScript diagnostics with the frozen parent. Record commands, exit codes, unexpected differences and approved exceptions.
- [ ] Verify development, review preview and production select their intended Supabase project and API host. Inspect identifiers and scopes without printing credentials. Check that the preview cannot fall back to a production backend, load saved production sessions, send paid AI requests, fulfill purchases or grant rewards. Test an unconfigured preview and an explicitly isolated staging configuration separately.
- [ ] Confirm environment and contract compatibility for app, API, auth redirects, wallet and storage before testing against an isolated staging service. The integration branch explicitly maps the EAS development, preview and production profiles to their corresponding environments. Run `node scripts/test-eas-environments.cjs`. Confirm the actual destination addresses in each environment before staging tests. Matching profile names alone do not verify remote values. [Expo environment mapping](https://docs.expo.dev/eas/environment-variables/usage/)
- [ ] Confirm the retired unauthenticated `/billing` and `/api/order-email` handlers remain unavailable. Before re-enabling a fulfillment email, require a verified order or receipt, authoritative recipient/items, and idempotent dispatch. Exercise duplicate requests and delayed notifications in isolation. Include concurrent store checkout from separate database connections before enabling purchase grants.
- [ ] Check upgraded Collections on a shared device. The old global flashcard cache has no owner identity and stays intact, quarantined from guest and accounts. Any recovery needs independently established provenance and explicit permission; a later login alone cannot establish ownership.
- [ ] Save a known-good web deployment and the previous shipped native versions. Verify existing clients remain supported. Record who can disable optional capabilities and how to restore the prior web deployment without reversing customer progress.

## Discover focused verification for PR #16

Application commit `90373758c560374a325b92517920ffd930a907d7` incorporates the prepared Orbit accessibility change `10e396e` and Adventure save/retry change `58691ff` on the frozen integration baseline `c27a753`. The Adventure regression patch has SHA-256 `249f3788d429e66254215c6c40c9898cc9e3e3c8bcf8995133a9b0990a256b89`. The original Orbit commit supplies its own browser test and narrow-screen evidence.

Run the Adventure, Journey and Orbit model scripts under Node 22. Export the resulting checkout with `scripts/export-vercel.cjs` in isolated preview mode, with an offline build, dummy public key and a fresh output directory. Set `QA_EXPORT` to that directory and `QA_CHROMIUM` to the Chromium executable. Run both commands against the same export.

```sh
python scripts/test-orbit-lab-browser.py
python scripts/test-adventure-save-browser.py
```

Orbit covers pressed controls, keyboard and touch interaction, and the diagram's accessible name at 1280, 390 and 320 pixels. Adventure covers an unsuccessful save followed by a successful retry, repeated clicks during a pending write, replay, reload, initial read recovery and a pending save across synthetic account changes. The account fixture rejects unsupported achievement and streak calls. Its expected errors are recorded by the test.

Record the resulting SHA and run outcomes in [PR #16](https://github.com/Sventography/Nova_Tutoring_expo/pull/16) and [coordination issue #11](https://github.com/Sventography/Nova_Tutoring_expo/issues/11). Track the hosted preview build and route checks separately. Real-account authentication and RLS, purchases, rewards, physical iOS and Android, and VoiceOver and TalkBack require independent evidence.

## User journeys and preservation

| Check | Where and evidence |
| --- | --- |
| Guest first launch, onboarding and permissions | Clean browser and fresh native install. Decline optional prompts, continue to school tools, use Back, background and relaunch. |
| Registration, confirmation, reset and sign-out | Two synthetic accounts in isolated staging. Exercise email/deep-link return, expired link, account switching, offline restart and fresh login. Verify guest drafts, Journal, purchases and currency stay with their owner. |
| Returning learner and upgrade | Seed an earlier-version fixture with progress, saved discoveries, purchases, decorations and a companion. Update in place. Compare item identities, transforms, inventory quantities, currency and Journal. Repeat offline and after reconnect. |
| Tutoring loop | Use synthetic content in Ask, flashcards, quiz, Journal and achievements. Check draft preservation and retry. For unavailable inference, verify a graceful disabled/error path. A successful real model response requires a separately authorized test. |
| Discover and motivation | Validate every catalog key, lesson route and lab/adventure target in automation. On a device finish a lab, choose a different branch, save, return a day later and reopen it. Confirm useful feedback on wrong answers, direct access without Island unlocks, freedom to change interests, and no mandatory point claim or streak. |
| Island, collections and companions | Confirm real WebGL/GL rendering, ownership and equip/unequip, district growth and collisions, shared object placement IDs, pan/orbit/pinch, failure to save, and animation and audio cleanup upon blur and background. On an older phone repeat Island → workshop → Island and inspect frame time, memory trend and responsiveness. |
| ARG and private Journal | Use fixtures for prerequisites and hidden triggers; find a clue naturally, inspect its automatic handwritten entry, reload offline, re-enter, switch accounts and compare. Verify no double entry, no spoiler on an unqualified account and an accessible text equivalent. Check real camera/QR only on devices. Keep First Twenty and live claims disabled. |
| Shop, wallet and rewards | Verify the single earned currency, read-only/unavailable messaging and preservation of existing balances. Use disposable database fixtures to test ownership, replay, concurrent claims and atomic rollback. Before approving fulfillment, verify authenticated server-side receipts and grants with store sandbox identities and isolated accounts. A real payment, paid AI request or live reward claim requires separate approval. |
| Accessibility and loading | Keyboard navigation, focus return from dialogs and attractions, VoiceOver/TalkBack, text scaling, touch targets, light/dark appearance and reduced motion. Record cold/warm time to usable screen, request hosts/counts, large transfers, interrupted load/retry and JS/native memory after repeated navigation. Record actual device/transport for each metric. |

## Web

- [ ] Confirm the Vercel build log references the reviewed SHA and a preview target. Load the HTTPS preview externally with fresh storage. Check direct links and refresh for Discover, Journal and Island; fonts, LFS artwork and 3D assets must resolve. Verify expected behavior with unavailable auth/backend rather than writing to production.
- [ ] Exercise desktop Chromium and mobile Safari/WebKit. Inspect JS errors, failed asset fetches, layout while the keyboard is open, small screen cropping and WebGL context recovery. Keep private deployment tests behind their configured access controls.

## iOS

- [x] Reviewed PR #13 at `1aec9bf232e672abf51dada387b3e4bae40f0309`. Its 13 offline guard cases passed. With empty release variables the guard returned failure. These tests did not contact Apple or EAS.
- [ ] Verify Apple Developer membership, App Store Connect app record and numeric ID, bundle ID `com.sventography.novatutoring.ios`, distribution certificate, provisioning, entitlements, and push/deep-link settings actually required by this build. Check build number against the last processed build. Checked-in iOS project and Info.plist specify 1.6.0 (103).
- [ ] Review privacy manifest, photo/camera usage strings, data handling, purchase restoration and store disclosures against what this binary does. Confirm accessibility of permission-denied paths.
- [ ] For future automation, the manual workflow in draft PR #13 needs to exist on the default branch and the protected `release/web-ios-working-20260115` ref. Configure `ios-release` with protected branch and reviewer, least-privileged environment secret and exact EAS CLI version. Its TestFlight profile currently lacks `ascAppId`. Check it against `IOS_ASC_APP_ID`. Keep the release switch off until approval of the exact SHA, cost and mode. Start with build-only when authorized. An EAS build, a TestFlight upload and public App Review are separate decisions.
- [ ] Compile a simulator or ad hoc build with the reviewed native dependencies on macOS; install and exercise the full journey on an iPhone, plus iPad layout if tablet support remains enabled. Verify interruptions, silent mode and foreground/background audio, camera/QR, offline storage and app links. Obtain sandbox receipt/restore and isolation evidence before opening IAP. No production purchase is necessary for this checklist.

## Android

- [ ] Compile the debug binary with the pinned wrapper and matching SDK/JDK. This workspace has Java, but Gradle 8.14.3 was uncached and its distribution was unreachable; no Android emulator/ADB was present. iOS Xcode and physical devices were also unavailable.
- [ ] Check package `com.sventography.novatutoring` and monotonic Play version code. Checked-in native Gradle uses version 1.5.0/code 3; dynamic Expo config declares 1.6.0. Reconcile the intended release version with the actual artifact and Play record. Inspect the signed artifact, not only Expo configuration.
- [ ] The checked-in Gradle release build type selects `signingConfigs.debug`. EAS injects its release signer during the managed build. Locally, signing settings can differ. Before an upload, verify the signing path in the actual intended builder and match the artifact certificate fingerprint against the Play upload certificate. Treat release packaging as blocked pending that verification. [Expo Android signing injection](https://docs.expo.dev/build-reference/android-builds/) Keep keys outside source control.
- [ ] Inspect the merged release manifest for justified permissions, especially microphone, storage and overlay. Test deny/revoke, system Back, large font sizes, process death, camera and GL restoration. Install on a lower-end physical Android phone and test native performance, audio focus and rotated/paused gestures. Use Google Play internal testing/license testers for any supported billing flow, with owner approval.

## Release decision

A release owner records each failed or untested item, its impact and whether the affected capability can stay visibly disabled. Store signing, new paid builds, publication, staff/system credentials and production data changes require their own authorization. The review branch, a successful preview, and green unit tests do not authorize them.
