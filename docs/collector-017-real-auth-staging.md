# Collector 017 — real Supabase Auth staging (NO production changes)

Status: **implementation prepared on feature branch; NOT provisioned or live**.
The phone camera + mock claims worked, and the isolated real-Postgres GitHub
workflow passed on 2026-10-28. Real Supabase Auth + actual app inventory have
not been tested yet. Neither existing Supabase project is staging:
one project is live, and an older project is inactive. **Do not reuse either
project for temporary collector codes or grants.**

## What this verifies

A separate Supabase Auth project issues real account access tokens.
The staging Flask API verifies them via that project's Auth endpoint, then
reads/writes only its own private PostgreSQL collector tables. The staging
Expo app uses the existing sign-in, collector certificate, and island
decoration provider. The hidden staging diagnostics view shows whether
the server-issued castle is genuinely visible in that account's island.

## 1. Obtain a new, separate Supabase staging project

Create a dedicated project (for example nova-collector-staging) in Supabase.
This may require another project slot or payment. Review costs before doing
that; no new project was provisioned by the assistant.

Save locally (never in GitHub): its HTTPS project URL, public publishable/anon
key, separate server-only PostgreSQL URI with TLS, and two disposable test
account credentials. Do NOT import production users, data, real codes or
customer records. Auth and database MUST belong to the same staging project.

To use the full Expo app, a schema-only staging copy of required PUBLIC app
tables (including profiles) and their existing RLS rules may be needed.
Never copy production profile/user rows.

## 2. Install the collector schema into staging only

In that *new project* SQL editor, execute these three existing files in order:

1. docs/collector-017-redemption-schema.sql
2. docs/collector-017-rate-limit.sql
3. docs/collector-017-permanent-serial-burn.sql

These contain private tables and server-only functions. Do not use live Nova
SQL Editor for this staging exercise; do not expose the collector_private
schema to the Supabase Data API.

## 3. Host a separate HTTPS staging backend

Use server/collector_staging_server.py, NOT server/server.py. It only has
collector APIs and /staging/health. A new Render staging service can have
its root directory set to server, with:

Build: pip install -r requirements.txt

Start: gunicorn 'collector_staging_server:create_app()' --bind 0.0.0.0:$PORT

Staging-only server environment variables:

    COLLECTOR_STAGING_SUPABASE_URL=https://STAGING-REF.supabase.co
    COLLECTOR_STAGING_PUBLISHABLE_KEY=STAGING_PUBLIC_KEY
    COLLECTOR_STAGING_DATABASE_URL=STAGING_POSTGRES_CONNECTION_URI
    COLLECTOR_STAGING_WEB_ORIGINS=https://YOUR-STAGING-WEB-HOST

Do not copy any production Render secrets. The standalone server refuses
production/old Supabase project IDs and database hosts that do not match
its Auth project. It also refuses any inherited COLLECTOR_DATABASE_URL.
The health endpoint should identify mode isolated_collector_staging.

For real JWTs, use HTTPS for a remote server. HTTP is allowed on 127.0.0.1
for Mac-only tests; never send JWTs over HTTP on the home LAN.

## 4. Generate disposable staging-only QR codes

Only once the schema and staging credentials are prepared, from the Mac:

    cd ~/dev/Nova_Tutoring_expo_3
    source server/.venv/bin/activate
    python server/collector_staging_seed.py --web-origin http://localhost:8081

The seeder checks the isolated project reference, refuses existing codes,
and creates two random staging-only codes (017 and 023). Only SHA-256 hashes
are stored in the staging DB; the original one-off links are displayed in
local Terminal output. Do not paste them in GitHub or share them publicly.

For a separate HTTPS staging web deployment, use its HTTPS origin instead.
A non-local plain HTTP origin is rejected. The seeder never uses
COLLECTOR_DATABASE_URL.

## 5. Run Expo with staging-only environment settings

Use the **new staging** project/public key and staging backend, not the live
Nova values. For a Mac developer session, configure:

    EXPO_PUBLIC_COLLECTOR_STAGING_MODE=true
    EXPO_PUBLIC_COLLECTOR_REDEMPTION_ENABLED=true
    EXPO_PUBLIC_SUPABASE_URL=https://STAGING-REF.supabase.co
    EXPO_PUBLIC_SUPABASE_ANON_KEY=STAGING_PUBLIC_KEY
    EXPO_PUBLIC_BACKEND_URL=https://YOUR-STAGING-BACKEND

Then use npx expo start --web on Mac. It may require a staging-only copy of
Nova's public schema to provide sign-in/profile features.

For a production-optimized web preview on a **different HTTPS staging
web domain only**, also set:

    EXPO_PUBLIC_COLLECTOR_STAGING_WEB_PREVIEW=true

Do not set the preview switch in the live EAS, Render or Vercel build
environments. Do not merge the feature branch into the release branch to
set up staging. Staging now fails to start if Supabase Auth or backend points
to either live/old Nova project or production Render host. It also stores
Supabase sessions under a staging-specific storage key.

## 6. End-to-end acceptance checks

1. Sign in to the staging Expo app with a NEW staging account A.
2. Open the staging #017 link from the seeder. See the serial only after
   server verification, then claim it.
3. Visit /collector-staging and refresh the ledger. It should show one
   server entitlement and island owned count 1.
4. Visit the Island tab and place the castle with the island builder.
5. Reload or sign out/back in as account A. Entitlement persists remotely.
   Island placement coordinates remain device-local (not cross-device synced).
6. Switch to staging account B on the SAME device. It must not have a castle;
   verifying #017 must report it already redeemed.
7. Scan/verify staging #023: authentic, but never grants the #017 castle.
8. For iPhone browser testing, use a separate HTTPS staging WEB host and
   HTTPS staging backend. Do not serve sign-in pages over plain HTTP on LAN.

The staging-only diagnostics link appears at the bottom of the collector
certificate. It is sealed in normal app builds.

## Acceptance boundary

GitHub Actions > Collector 017 security and app checks is manual-only on
feature/noras-last-lantern-3d and exercises mocked Auth server semantics,
staging isolation, and the Expo web export. The separate manual PostgreSQL
workflow tests actual private SQL claim transaction behavior.

No production collector flags were enabled. No production QR codes or
entitlements were issued. Do NOT declare real-auth staging complete until a
separate project exists, the service is on HTTPS, and a real staged account
can claim and inspect its castle in Expo.
