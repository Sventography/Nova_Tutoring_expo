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

The 13 mock checks (confirmed successful on the Mac, 2026-10-28) cover authentication, disabled endpoints, certificate response and
no-cache headers, permanent single-use claims, own-account retry, cross-account
rejection, owner identity privacy, deleted-account permanent serial burn and truthful
claimed status, inventory isolation, no castle for other serials, malformed codes,
shared verification/claim attempt quotas, and missing database configuration.
The user ran the updated 13-test mock suite on Mac: "Ran 13 tests ... OK".
The new staging-Auth tests and their modified manual CI workflow are NOT yet
independently verified; they must be run before staging is activated.

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

**Status (2026-10-28):** GitHub Actions returned a green check for the
manual isolated PostgreSQL staging workflow (user-provided screenshot).
A later QR/API/Postgres smoke test was added to the runner after that run and
has not yet been executed in CI. A green SQL workflow does NOT prove a real
Supabase token, native deep link, or island inventory synchronization.
Do not enable production redemption or print real physical QR codes.

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

## iPhone camera QR flow — temporary local staging page

**These QR codes are generated fresh on the Mac, are not physical product
codes, and can never grant a live Nova reward.** The phone opens the temporary
Flask certificate page in Safari, not the published Nova app. "Test Owner A/B"
are synthetic, not actual Supabase logins. The separate staging workflow tests
the real PostgreSQL SQL boundary; the browser scanner test checks the physical
iPhone camera and the collector certificate's API interactions.

### Easy mode: no Docker required (UI + scan, mock storage)

Mac and iPhone must be on the same Wi-Fi. From the feature branch:

```bash
cd ~/dev/Nova_Tutoring_expo_3
git -c core.sshCommand="ssh -p 443 -o Hostname=ssh.github.com" fetch origin
git merge --ff-only origin/feature/noras-last-lantern-3d
cd server
source .venv/bin/activate
python -m pip install "Flask>=3,<4" "psycopg[binary]==3.2.10" "qrcode==8.2"
cd ..
python server/tests/run_collector_qr_demo.py --mock
```

Open the printed `http://<private-Mac-IP>:5057/stage` address on Mac.
Click **Allow** if macOS asks whether Python may accept local connections.
Scan the first QR from the iPhone's regular Camera app and open its link.
Tap **Test Owner A**, verify, claim #017, then check the staging inventory.
Switch to **Test Owner B** and verify again: code must say already claimed,
and B must have no reward. Scan the **023** QR as B to confirm it is authentic
but never unlocks the castle. Return to Owner A and check the entitlement.
The QR uses a `#code=` fragment so a regular HTTP GET omits the token.

The mock mode is **only for camera/UI testing**. It is labeled on screen and in
Terminal. Stopping the process discards all grants and QR tokens. The earlier
real-database staging suite remains the source of SQL/transaction verification.

### Stronger local mode: full real PostgreSQL + QR (Docker required)

If Docker Desktop or OrbStack is installed and running, omit `--mock`:

```bash
python server/tests/run_collector_qr_demo.py
```

This creates its own Docker container with real Postgres, applies all three
private SQL migrations, then launches the same certificate page on port 5057.
Neither command reads a production database URL or a real Supabase account.
Control+C ends the demo and removes the disposable Docker container.

If network detection chooses an unreachable VPN address, find your Mac's
Wi-Fi IPv4 in **System Settings → Wi-Fi → Details → TCP/IP**, then use
`--host-ip 192.168.x.x` with your *actual private* address. Never give this
demo a public IP, attach a public tunnel, or scan from cellular data.

### Unverified boundaries

The QR staging page checks native camera -> temporary browser -> backend
verify/claim/entitlements -> mock or disposable PostgreSQL. It **does not yet**
exercise native `nova://` deep links, real Supabase JWTs/registration,
the live island entitlement provider, or placing the castle on another device.
Those require a separately configured staging Auth/backend environment;
never test them with production codes or production grants.

## Next milestone: separate Supabase Auth + actual Expo island inventory

See **docs/collector-017-real-auth-staging.md** for the detailed setup and
acceptance plan. Prepared feature-branch components:
- server/collector_staging_server.py — uses the existing secure collector
  routes but verifies tokens with a separate project's Supabase Auth.
- server/collector_staging_seed.py — securely issues two disposable staging
  QR codes and refuses Nova's actual projects or an existing edition.
- app/_lib/collectorStaging.ts — refuses production Auth/backend configuration
  and separates saved staging sessions from real Nova sessions.
- app/collector-staging.tsx — unlinked staging-only view to compare backend
  entitlements with real IslandDecorationProvider inventory.
- scripts/test-collector-staging-config.cjs, server/tests/test_collector_staging_server.py,
  and server/tests/test_collector_staging_seed.py — regression checks added
  to the opt-in Collector 017 CI workflow.

**Blocker:** The connected Supabase account currently has only live and
inactive historical Nova projects. No isolated real-Auth staging project
or separate HTTPS Render staging service has been provisioned. This
milestone is PREPARED, not complete, and its new tests must still be run.
Production collection remains disabled and no live codes are issued.

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
