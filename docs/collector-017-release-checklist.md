# Nora's Last Lantern — collector QR integration

## Current safety state (2026-10-28)

- Feature branch: `feature/noras-last-lantern-3d`. Do not merge into the live Render release branch until end-to-end tests pass.
- Private Supabase objects were installed in the active `nova-tutoring` project. SQL is preserved in `docs/collector-017-redemption-schema.sql` `docs/collector-017-rate-limit.sql`, and `docs/collector-017-permanent-serial-burn.sql`.
- **Zero production collector codes issued. Zero collector rewards granted.**
- Server claims and client verification are OFF unless explicitly enabled.
- The legacy 3D developer preview position was not changed.

## Server connection (Render: `nove-tutoring-backend`)

Python Flask entrypoint is `server/server.py`. These settings belong in **Render environment variables only**:

- `COLLECTOR_DATABASE_URL`: Supabase PostgreSQL connection/pooler string using a trusted, server-only database login. The backend uses TLS (`sslmode=require`). Do not use a `EXPO_PUBLIC_` variable or distribute this string in an app build. A direct PostgreSQL connection is required because `collector_private` is intentionally not exposed through the Data API.
- `COLLECTOR_REDEMPTION_ENABLED=false` until real test claims, schema and production release have been reviewed.

The server uses the existing Supabase credentials to validate the caller's access token and **does not accept a user ID from the client**. The private database function performs the atomic, account-bound claim. A spent serial remains spent even if its original owner deletes their Nova account; the account reference is anonymized while the claim timestamp is retained.

API endpoints:

- `POST /api/collector/verify` — authenticated QR authenticity lookup; returns serial number only if the code matches, and never returns the claimant's identity.
- `POST /api/collector/redeem` — authenticated single-use claim of #017. This is disabled by default, and enforces five code lookup/claim attempts per signed-in account per hour via PostgreSQL.
- `GET /api/collector/entitlements` — signed-in account's permanent grants; no caller-provided user ID.

All collector API responses are non-cacheable. Codes are SHA-256 hashed in the backend before lookup. The random QR string must be generated securely offline, at least 256 bits of entropy.

## Mobile / web

- `app/collector/index.tsx` is deliberately **not linked** in normal navigation and is a fixed static route, compatible with the current Expo `web.output: static`.
- Suggested eventual physical QR URL: `https://<nova-web-host>/collector#code=<cryptographically-random-token>`. The fragment stays outside standard HTTP request URLs and web server request logs.
- Native custom-scheme link (if needed): `nova://collector?code=<token>`. No universal-link association is configured yet.
- The signed-in holder sees serial information **only after server authenticity verification**; guests are invited to sign in and reopen the QR link.
- Set `EXPO_PUBLIC_COLLECTOR_REDEMPTION_ENABLED=true` for the app/web build **only when** the server and fulfillment process are ready. Until then, the page remains a preview.
- Vercel headers prevent indexing and referrer leakage on the collector page.
- The island provider checks `GET /entitlements` after signed-in inventory loads; it adds exactly one #017 castle for the true owner, and hides locally forged/stale #017 entries while verification is unavailable. Local `grantDecoration` cannot issue #017.
- The server-side entitlement follows the account across devices. **Island placement coordinates remain device-local** under the existing decoration storage design; syncing island layouts is a separate feature.

## Safe local mock test (no real codes or customer database writes)

Pull the feature branch before testing. From the repo root, with the existing Python
virtual environment active and Flask installed, run:

```bash
cd server
PYTHONPATH=. python -m unittest discover -s tests -p 'test_collector_redemption.py' -v
```

This suite runs Flask's in-process test client with a mocked PostgreSQL connection and
two pretend Auth accounts. No live JWTs, actual collector QR codes, real database
passwords, or production schema writes are required.

The 13 mock checks cover authentication, disabled endpoints, certificate response and
no-cache headers, permanent single-use claims, own-account retry, cross-account
rejection, owner identity privacy, deleted-account permanent serial burn and truthful
claimed status, inventory isolation, no castle for other serials, malformed codes,
shared verification/claim attempt quotas, and missing database configuration.
An earlier version of the backend suite passed GitHub Actions. **The current 13-test
version has not yet been executed in CI and must not be represented as a pass.**

Read-only verification of the active Supabase project confirmed on 2026-10-28 that
the collector tables contain zero codes, zero grants and zero attempt records;
that anon/authenticated lack private schema usage and claim-function execution;
and all three collector tables have RLS enabled. None of these checks constitute a
live end-to-end test.

## Isolated real-PostgreSQL integration suite (manual only)

In addition to the 13 mocked Flask tests, the feature branch has a separate,
**explicitly launched** integration runner:

```bash
cd ~/dev/Nova_Tutoring_expo_3
# On the feature branch; start Docker Desktop / OrbStack before running.
cd server
source .venv/bin/activate
python -m pip install "Flask>=3,<4" "psycopg[binary]==3.2.10"
cd ..
python server/tests/run_collector_postgres_staging.py
```

What it does:
- Creates its own `postgres:17-alpine` Docker container with an ephemeral password
  and randomized name, bound **only to 127.0.0.1** on a random port.
- Does **not** read any production database URL, Render secret, or Supabase JWT;
  does not import the live Flask app or change live schema.
- Applies exactly the three checked-in collector SQL files, with minimal local
  `auth.users`, `anon`, `authenticated`, and `service_role` fixtures.
- Creates random disposable fake codes and two synthetic account IDs.
- Exercises the real Flask collector routes against **real Postgres**, including
  secret-code verification, #017 ownership, duplicate claims, another-account
  denial, cross-request entitlement persistence, account deletion, rate limits,
  RLS grants and two simultaneous claim attempts.
- Tests the production TLS requirement via a local-only `psycopg` wrapper that
  substitutes `sslmode=disable` for the disposable vanilla Docker image.
  **This does not relax production's `sslmode=require` setting.**
- Stops/removes its test container in `finally` even on failure. Docker must
  already be installed and running; the image may need to be downloaded.

**Status:** Runner added to feature branch, but execution against Docker/Postgres
and a real Supabase-authenticated staging app have *not* yet been verified.
A green run of this suite checks the database SQL/Flask boundary; it is NOT a
complete mobile QR deep-link/real-JWT/Render deployment test. Do not enable
production redemption or print real QR codes based solely on this suite.

### Optional one-click GitHub test (no Docker on your Mac)

A second manual-only workflow is registered at
`.github/workflows/collector-017-postgres-staging.yml` on the repository's
default branch solely to make GitHub's **Run workflow** UI available. It does
not deploy the app or run on a push. Its job is explicitly gated to
`feature/noras-last-lantern-3d`; running it on another branch skips the job.

In GitHub: **Actions → Collector 017 isolated PostgreSQL staging →
Run workflow → select `feature/noras-last-lantern-3d` → Run workflow**.
Inspect the `postgres-staging` job result and the seven integration checks.

The workflow was registered and the runner source committed, but no actual
PostgreSQL test run has been observed yet. Do not claim success until the
workflow/job reports success.

## Verification before any production activation

1. Run the mock suite above and record the result. The GitHub workflow is manual-only:
   **Actions > Collector 017 security and app checks > Run workflow**; select
   `feature/noras-last-lantern-3d`. Do not re-enable push-triggered failure emails.
2. Run `npx tsc --noEmit`, and `npx expo export -p web`. CI workflow `.github/workflows/collector-017-tests.yml` is configured to run the Python tests, app typecheck, and a web export. Check the actual GitHub Actions run results before deployment; creating the workflow alone does not prove the tests passed.
3. Confirm all three SQL migration stages are present; anonymous/authenticated PostgreSQL roles must not have direct schema usage or function execute permissions.
4. In an isolated **staging** environment, provision only disposable test codes and test users; exercise first claim, same-owner retry, another-owner rejection, rate limits, and concurrency. Do not write disposable codes or fake users into production.
5. Supply `COLLECTOR_DATABASE_URL` through Render secrets; confirm the secure connection and entitlement GET work with a real JWT. Review service logs without exposing tokens or codes.
6. Verify the collector web route returns a page at `/collector`, works with a fragment URL, and is excluded from search engine indexing.
7. Approve printing of actual physical QR codes **only after** physical serial numbers are confirmed. Keep the codes and printable QR artwork in secure fulfillment storage, never in GitHub or the client.
8. Merge/deploy to the actual live release branch deliberately, then enable the server/client flags in coordination.

## Physical-series rules

The ARG is playable without purchase. Do not reveal serial numbers or remaining inventory before a customer receives a plushie. Only physical #017 gets gold stitching and `noras_last_lantern_017`; other 99 numbered plushies and ordinary merch have separate, future reward paths. The authenticity record can say “017 of 100” only after verification of the shipped QR code.
