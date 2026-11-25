# iOS release candidate and TestFlight automation

Status: **draft; disabled until integrated QA, signing and owner configuration are complete.** This does not publish the app.

## One-time setup (owner in GitHub and Expo)
1. Review and integrate the workflow into the actual iOS release branch, and make it available on the repository default branch so manual dispatch is registered. The current default branch is `save/fx-themed-rain-20251030-140935`; do not change it without coordination.
2. Create a GitHub Actions environment named `ios-release`. Restrict deployment to `release/web-ios-working-20260115` only; require a trusted reviewer and disable bypass where supported. Protect the release branch from unreviewed changes. Verify these controls in GitHub, rather than assuming a YAML environment name enforces them.
3. Confirm the existing Expo project, Apple bundle identifier, App Store Connect app record, active distribution certificate and provisioning profile. Run the initial EAS configuration interactively using your own authenticated Expo session if credentials are missing. Store the Apple submission API key in EAS, not the repository or chat. Verify the exact numeric App Store Connect app ID, then set `submit.production.ios.ascAppId` in eas.json and the matching environment variable `IOS_ASC_APP_ID`. The empty submission profile is deliberately nonfunctional until configured.
4. Put a least-privilege Expo access token in the protected environment secret `EXPO_TOKEN`, not a repository-wide secret. Set `EAS_CLI_VERSION` to a tested exact published version. Review EAS plan/quota and build cost before enabling. No plan changes or expedited builders.
5. Review the final integrated commit (stability + Discover + QA fixes), signed-in wallet/receipt migrations, native devices, 3D Island, privacy, Apple payment rules, version/build-number monotonicity and release notes. Resolve TypeScript/build/runtime blockers. Confirm no unintended production credential or staging URL, and all activation flags remain correctly disabled. Set `IOS_APPROVED_SHA` to that exact 40-character SHA and `IOS_RELEASE_ENABLED` to `true` only for an approved release. Return the switch to false after the run.

## Run
In GitHub Actions select **iOS release candidate (manual)**, choose the protected release branch and enter the exact approved SHA. Select **build-only** first, or **testflight** after approving the configuration. Approve the protected environment job. The build uses existing EAS production profile and freezes signing credentials. The testflight option uses auto-submit tied to the actual new build, never a potentially unrelated latest build.

Verify the EAS build record and the exact submission record, then verify the processed build in App Store Connect and test on physical devices. EAS upload is not Apple public review submission. A human must approve the selected build, review metadata/privacy and submit for App Review separately; do not release until ready. If a build fails, inspect exact logs and obtain approval before another potentially billable attempt. No changes to production web deployment or backend are made by this workflow.

## Local offline validation
`node scripts/test-ios-release-guard.cjs` checks dispatch mode, branch, SHA binding, disabled switch, CLI pin, app ID, store profile and collector flags. These are guard unit tests, not real signing or submission evidence. The protected environment must be configured and verified separately. The workflow is not authorized by a green guard alone.
