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
