# Collector #017: REAL staging Auth and island entitlement test

**Status (2026-10-29):** Staging project CREATED and private schema INSTALLED.
Staging Supabase Edge Function DEPLOYED (active, verify_jwt=true).
Real-user login, redemption, and cross-device Island confirmation are
**not yet tested**. Production Nova remains unchanged.

## Staging project (no production accounts or QR codes copied)

- Organization: Nova Tutoring (Free)
- Project: nova-collector-staging
- Reference: gouhhltupxaycuysdtrw
- Dashboard: https://supabase.com/dashboard/project/gouhhltupxaycuysdtrw
- Project URL: https://gouhhltupxaycuysdtrw.supabase.co
- Region: us-east-1; created after a verified $0/month quote
- Never target live Nova (owlbqyiqsyfcrpqqfacp) or old inactive
  Nova (zgrixkqcowitlygbvrlw) during collector testing.

### Database completed

Supabase migration history:
- collector_017_private_schema_rate_limit_permanent_serial
- staging_profiles_owner_only_and_signup_check
- fix_staging_check_username_coalesce

The first migration applies the exact three checked-in private SQL files
in order: docs/collector-017-redemption-schema.sql,
docs/collector-017-rate-limit.sql, and
docs/collector-017-permanent-serial-burn.sql.

The other two migrations create a SCHEMA-ONLY public.profiles table
compatible with the existing Expo sign-in flow, plus owner-only RLS,
and the check_username RPC. The consolidated corrected reference SQL
is checked into docs/collector-017-staging-profile-schema.sql.
No production profile rows or Auth identities were copied.

Verified on 2026-10-29:
- Three collector_private tables: ALL RLS-enabled, ALL initially empty
- No schema usage/claim function execution for anon or authenticated
- service_role may execute trusted private collector functions
- A claimed serial remains permanently spent after account deletion
- Staging profiles have four owner-only RLS policies
- Anonymous users cannot SELECT profile rows
- Anonymous pre-signup RPC check_username("Test017") returns "ok"
- Zero staging user accounts, QR codes, redemptions, and entitlements
  at time of installation

Supabase security advisor notes:
- INFO: Three private tables with no RLS policies. INTENTIONAL.
- WARN: public.check_username is a SECURITY DEFINER RPC executable
  by anon/authenticated. This is a deliberately constrained read-only
  exception to check case-insensitive username availability before
  sign-up. It returns only a fixed status and runs with an empty search
  path. Do not add identifying data to the response or broader privileges.
  Revisit before production sign-up; this is staging-only.

## FREE staging backend: Supabase Edge Function

**No second Render service is required for this staging run.**

Deployed function: collector-staging (version 1), JWT verification ON.
Its source is committed at:

    supabase/functions/collector-staging/index.ts

It exposes the same collector API response shapes as the Python backend:

    GET  https://gouhhltupxaycuysdtrw.supabase.co/functions/v1/collector-staging/entitlements
    POST https://gouhhltupxaycuysdtrw.supabase.co/functions/v1/collector-staging/verify
    POST https://gouhhltupxaycuysdtrw.supabase.co/functions/v1/collector-staging/redeem

Only a valid staging user JWT is permitted by the Edge gateway.
The handler also verifies the caller against staging Supabase Auth using
getUser(token), then queries the STAGING project's built-in SUPABASE_DB_URL,
with existing private stored procedures handling rate limit and claims.
Neither this function nor Expo contains any service-role or database secret.

Browser CORS origins currently permitted: localhost / 127.0.0.1 at
port 8081 or 19006 (Mac development only). A future HTTPS staging web
preview will require explicitly whitelisting its own HTTPS origin in
the Edge source, then redeploying **only** to the staging project.

The Edge deployment is active, but a successful real JWT claim has not
yet been observed. Passing existing PostgreSQL and mock tests does not
replace that acceptance test.

## Test-user status and one-command Mac startup (2026-10-29)

Two NEW staging Auth users are present and email-confirmed. This was
verified by a count-only SQL query (no addresses or passwords disclosed).
There are still zero actual account-owned collector entitlements.

Use the provided, project-pinned launcher rather than copying environment
values manually. The launcher includes only a **public** Supabase publishable
key, checks for the required feature branch, and runs local Expo on port 8081:

    cd ~/dev/Nova_Tutoring_expo_3
    git -c core.sshCommand="ssh -p 443 -o Hostname=ssh.github.com" fetch origin
    git merge --ff-only origin/feature/noras-last-lantern-3d
    bash scripts/start-collector-staging-web.sh

Then manually open http://localhost:8081/sign-in in a **Safari Private**
window on the Mac. Use staging account A's email/password (do NOT share
credentials in chat). Next visit http://localhost:8081/collector-staging
and click "Recheck server & island inventory" to verify an actual
authenticated request returns ZERO castle entitlements before redeeming.

If these checks succeed, open the staging-only #017 link from the
private locally saved file, claim as A, refresh the diagnostic inventory,
and later test B. Do not use the old **mock QR server** on port 5057 for
this real-account test. In the staging Edge gateway, only port 8081 or
19006 on local loopback is whitelisted for CORS.

This check is **not verified yet**; the user still needs to run Expo and
authenticate. Never deploy these staging-only configs to the public app.

## Known staging startup error — fixed on the feature branch

If Expo showed:

    [COLLECTOR STAGING] Collector staging refuses Nova's production
    or former Supabase project.

the protective guard rejected a stale production Supabase URL from Expo's
runtime environment or its cached config. The staging launcher had already
exported the correct project, but Expo could still pick up an old .env or
manifest value. To fail **safe** *and* start reliably, explicit staging mode
now pins ALL three public connection values to the same isolated project:
Auth URL, publishable key, and collector Edge base URL. Production remains
environment-driven and unchanged. The Expo app.config.js path is pinned too,
including server-side rendering. Launcher sets EXPO_NO_DOTENV=1 to prevent
old local Nova environment values being loaded.

Pull the latest feature branch, stop the previous Expo process (Ctrl+C),
then rerun:

    cd ~/dev/Nova_Tutoring_expo_3
    git -c core.sshCommand="ssh -p 443 -o Hostname=ssh.github.com" fetch origin
    git merge --ff-only origin/feature/noras-last-lantern-3d
    bash scripts/start-collector-staging-web.sh

Open a fresh Safari Private window at http://localhost:8081/sign-in.
Never lower/remove the staging guard to make an environment error go away.

The pinned URLs and public client key are not server secrets; no live
production account/password should be used in staging. This fix must be
tested in a real Mac Expo run before declaring login end-to-end proven.

## How to launch staging Expo on the Mac

1. Pull feature/noras-last-lantern-3d onto the development clone.
2. Obtain ONLY the staging project's PUBLIC publishable key via
   Dashboard > Project Settings > API Keys. Never use service_role or
   any sb_secret_... key in Expo.
3. Set the following in an ignored local .env file OR prefix the Expo
   startup command with environment variables (do not commit secrets):

    EXPO_PUBLIC_COLLECTOR_STAGING_MODE=true
    EXPO_PUBLIC_COLLECTOR_REDEMPTION_ENABLED=true
    EXPO_PUBLIC_SUPABASE_URL=https://gouhhltupxaycuysdtrw.supabase.co
    EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_STAGING_PUBLISHABLE_KEY
    EXPO_PUBLIC_BACKEND_URL=https://gouhhltupxaycuysdtrw.supabase.co

4. On Mac, start from the repository root:

    npx expo start --web -c

The client collector API switches to
/functions/v1/collector-staging/* only in explicit staging mode.
No claim request from staging is ever sent to the live Render backend.
The staging auth storage key does not reuse a production session.

No direct deployment to the public production app is needed for this test.
A separately hosted HTTPS staging web preview, if later created, also
requires EXPO_PUBLIC_COLLECTOR_STAGING_WEB_PREVIEW=true.

## UX feedback from the first real #017 redemption (2026-10-29)

Confirmed in a real signed-in staging account: server #017 entitlement is
confirmed; Island owned count = 1; unplaced castle inventory = 1. The
redemption and owner-bound inventory sync both succeeded.

Two legitimate UX defects were found during manual staging:
1. The castle was invisible until the collector scrolled below the 3D
   world, tapped BUILD, expanded *Decoration Inventory* (not regular
   Inventory), tapped Last Lantern PLACE, then SAVE.
2. Random small-decoration auto-placement could put the enormous castle
   directly on top of the Daily Quest tracker.

Feature-branch fixes, pending new manual UI/CI verification:
- Certificate now explicitly walks the user through BUILD → Decoration
  Inventory → PLACE → SAVE and offers an Open my island action.
- The staging diagnostics screen also shows placement directions.
- The collapsed Island Builder shows a clear "castle ready" notice when
  the collectible is unplaced. Decoration Inventory auto-opens when a
  verified account has an unplaced #017 and highlights that item.
- The royal castle has a 4.8-unit conservative circular collision radius
  (the model's 3.05-unit foundation and +Z royal approach are physically
  large). Quest station is protected at approximately x=4.18,z=0.22,
  radius=3.5, matching the 3D station + parent world rotation.
- New castles prefer a deterministic clear starting point x=-12,z=-7,
  with normal collision-aware fallback around movable landmarks.
- On server-authorized inventory refresh, *only* a previously placed
  #017 that overlaps the protected quest pavilion can be relocated to a
  safe position. It preserves the same ownership, placement ID and
  unrelated decoration layouts. It never issues another entitlement.
- Manual-only CI now includes
  scripts/test-collector-castle-placement.cjs and modified file checks.

To test the fix: pull the feature branch, stop Expo with Ctrl+C,
restart bash scripts/start-collector-staging-web.sh, open the island,
then recheck /collector-staging. The already-claimed castle should
remain owned and no longer block the quest tracker. Test a fresh
unplaced flow in a separate disposable account only with a NEW
staging code; never reissue the spent #017 QR.

**This UI change is not yet tested on a real running Mac app.** No
production deployments or real physical collector codes were changed.

## Next steps (still required)

1. In the STAGING project's Authentication > Users, create two
   disposable test user accounts. They must be genuine users in this
   staging project, NOT live Nova users. You may use your own accessible
   test email addresses / aliases and manage confirmation there.
2. Sign in to staging Expo /sign-in with test account A, then account B.
   Check /collector-staging shows the current user but no castle yet.
3. After staging login works, generate separate one-time *test-only*
   QR codes for serials 017 and 023. Do not use any physical product
   codes. The guarded Python seeder is at
   server/collector_staging_seed.py if you have a staging-only PostgreSQL
   URI; keep its output private. It must never be run against live Nova.
4. Open the TEST #017 URL in staging Expo while A is signed in. Verify
   authenticity, redeem, and check /collector-staging: server and island
   counts must show 1. Place the castle in Island Builder.
5. Sign out/back into A; reward must persist remotely.
6. Sign in as B: zero inventory; #017 already claimed; #023 cannot
   grant the castle.
7. Only then host a separate HTTPS web preview and test the iPhone QR
   scan and app login together. No real JWT on plain HTTP home LAN.

The 13 mocked Python tests, 7 PostgreSQL tests and QR API smoke test have
passed previously. The newer 26-test security backend run passed; the
Expo build was fixed to hydrate Git LFS assets, and the user reported
its subsequent manual run succeeded. This NEW Supabase Edge runtime
requires real-user authentication and DB round-trip verification.

Do not activate production collector redemption or issue physical
codes based on staging success alone.
