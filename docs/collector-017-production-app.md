# Collector #017 production app preparation

This change prepares the Nova Tutoring app for the existing production collector backend. It is based on `release/web-ios-working-20260115` at merge `e95e526` (backend PR #2), with the collector app work isolated on `codex/collector-production-app`.

## Behavior

- `/collector` shows the certificate and, when enabled, verifies the physical edition and claims the #017 reward using the signed-in Nova account. Web QR codes belong in the URL fragment (`/collector#code=...`); native `nova://collector?code=...` links are supported. No real code is committed here.
- The standalone certificate provides sign-in and Island navigation. After signing in, reopen/scan the QR; the code is never added to an auth redirect.
- Entitlements are fetched even while new claims are disabled. Only an authenticated server response makes the castle visible/usable. Cached state preserves placement through an outage but does not establish ownership. Account/token changes and stale requests cannot transfer ownership between accounts.
- New ownership adds one castle to Decoration Inventory. BUILD → Decoration Inventory → PLACE → SAVE places it separately from Nova, landmarks, and decorations. Moving or resizing landmarks also respects the castle footprint. Tapping the placed castle outside BUILD triggers its lantern/fireworks animation.
- Collector rewards are absent from the coin shop and cannot be bought through its context API. Existing ordinary decoration prices, builder/decoration storage versions and keys are retained.
- This is a production-only port. Events, quests, staging auth/seeding, developer preview grants, and the broader feature branch scene changes are excluded.

## Disabled release state

The client enables verification/redemption only when `EXPO_PUBLIC_COLLECTOR_REDEMPTION_ENABLED` is literally `true`; unset/false disables both. The production EAS profile explicitly sets this and all staging/developer-preview flags to `false`. App config rejects staging/developer-preview flags set to `true`.

Render's separate `COLLECTOR_REDEMPTION_ENABLED` remains `false`. Nothing in this change enables it. Existing authenticated entitlement GETs remain available.

These are two independent switches. Enabling Render later cannot enable a client bundle built with its flag false. Activation needs a newly built/published client bundle with the client flag true and the server flag true.

Normal Nova app identity, scheme, version/build numbers and native projects are preserved. This preparation does not create or submit an IPA, OTA update or production web deployment.

## Verification evidence

- Production backend already verified by the user's hidden-input check: authenticated entitlements HTTP 200, database query succeeded, owned rewards 0, temporary session signed out. No real code was redeemed. Repeating that login check is unnecessary for this PR.
- Isolated executable regressions cover API contracts, default-disabled behavior, production backend pinning, fragment/native links, certificate request races, cross-account isolation, cached placement recovery, ownership refresh during edits/SAVE, unique inventory, coin-purchase exclusion, footprint boundaries and inverse landmark collisions.
- `scripts/check-collector-types.cjs` typechecks all changed collector entry points and their imported dependencies. It intentionally excludes unrelated historical backups included by the repository-wide tsconfig.
- Static web export runs with dummy Supabase configuration, no local dotenv, and redemption false. This verifies compilation/SSR and generation of `/collector`, not production login or real redemption.
- `collector-production-app.yml` runs these checks on this branch and release-targeted PRs with LFS assets and no live credentials.

Earlier iPhone collector-staging QA remains useful evidence for the design. This narrower production integration has not been installed on a device yet; do not mark it as production-device QA.

## Before activation

1. Review and merge the isolated app change after its checks pass. Keep both redemption switches off during preparation.
2. Establish a working HTTPS collector QR destination. The reported production Vercel root returned 404; a successful preview build alone does not establish a working production host. Verify `/collector` and the private fragment survive navigation on the intended host.
3. Choose and verify the physical QR handoff: the HTTPS web certificate path, or an implemented/tested HTTPS-to-native bridge. The existing custom `nova://` scheme alone is not an HTTPS universal-link bridge. Do not print production QR URLs before this is settled.
4. Confirm production app builds use the production Nova Supabase project and the production Render backend. Branch-only Vercel variables configured for the previous backend PR do not automatically configure this new branch. A dummy-config CI/preview bundle cannot validate production sign-in and must not be promoted as the real app.
5. Assign an unused iOS build number in the actual native project and EAS/app config before building the release. The tracked native project controls the IPA; this PR deliberately does not guess the next number.
6. Use the new release candidate for focused device checks of certificate → Island navigation, owner-only inventory/placement persistence, account switching, and castle/landmark collision controls. Do not repeat all unrelated staging tests.
7. Enable client and server redemption only for the approved release. Keep the existing private QR material and permanent claimed-at semantics; a real production claim consumes that physical code.
