"""Isolated real-Postgres integration tests for Nova's collector redemption.

Run explicitly from the repository root:
    python server/tests/run_collector_postgres_staging.py

This script creates its OWN throwaway PostgreSQL Docker container, binds only to
127.0.0.1 on a random port, uses random fake users/QR codes, then removes it.
No real Supabase users, production database, Render services or QR codes involved.

Flask authentication is stubbed only in this test process, while the backend
route implementation and all three production SQL files are exercised verbatim.
Local vanilla PostgreSQL has no TLS certificate; the test process overrides
psycopg's sslmode for ONLY its generated localhost DSN. Production code keeps
sslmode=require and is not modified by this runner.
"""

from __future__ import annotations

import concurrent.futures
import hashlib
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import sys
import threading
import time
import unittest
import uuid
from unittest.mock import patch
from urllib.parse import quote, urlparse

try:
    import psycopg
    from flask import Flask, request
except ImportError as exc:
    raise SystemExit(
        "Dependencies missing. Activate server/.venv, then install: "
        'python -m pip install "Flask>=3,<4" "psycopg[binary]==3.2.10"'
    ) from exc

HERE = Path(__file__).resolve()
REPO_ROOT = HERE.parents[2]
SERVER_ROOT = HERE.parents[1]
sys.path.insert(0, str(SERVER_ROOT))
from collector_redemption import register_collector_routes  # noqa: E402

POSTGRES_IMAGE = "postgres:17-alpine"
DATABASE_NAME = "nova_collector_isolated_test"
MIGRATIONS = (
    "collector-017-redemption-schema.sql",
    "collector-017-rate-limit.sql",
    "collector-017-permanent-serial-burn.sql",
)
REWARD = "noras_last_lantern_017"
REAL_CONNECT = psycopg.connect


def docker(*arguments: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(["docker", *arguments], text=True, capture_output=True)
    if check and result.returncode:
        # Never print the Docker CLI args: they can include a disposable password.
        raise RuntimeError(f"Docker {arguments[0]} failed: {result.stderr[-500:]}")
    return result


def launch_temporary_database() -> tuple[str, str]:
    if not shutil.which("docker"):
        raise RuntimeError("Docker is not installed; use Docker Desktop or OrbStack.")
    if docker("info", "--format", "{{.ServerVersion}}", check=False).returncode:
        raise RuntimeError("Docker is not running; open Docker Desktop or OrbStack.")

    # The test never accepts a user-supplied connection URL or database target.
    name = f"nova-collector-stage-{os.getpid()}-{secrets.token_hex(3)}"
    password = secrets.token_urlsafe(24)
    docker(
        "run", "--rm", "--detach", "--name", name,
        "--tmpfs", "/var/lib/postgresql/data:rw,size=256m",
        "-e", f"POSTGRES_PASSWORD={password}",
        "-e", f"POSTGRES_DB={DATABASE_NAME}",
        "-p", "127.0.0.1::5432", POSTGRES_IMAGE,
    )
    try:
        published = docker("port", name, "5432/tcp").stdout.strip().splitlines()
        if len(published) != 1 or not published[0].startswith("127.0.0.1:"):
            raise RuntimeError("Refusing a non-local or ambiguous staging port.")
        port = int(published[0].rsplit(":", 1)[1])
        dsn = (
            f"postgresql://postgres:{quote(password, safe='')}"
            f"@127.0.0.1:{port}/{DATABASE_NAME}"
        )
        parsed = urlparse(dsn)
        if parsed.hostname != "127.0.0.1" or parsed.path != "/" + DATABASE_NAME:
            raise RuntimeError("Refusing non-isolated database URL.")

        for _ in range(100):
            try:
                with REAL_CONNECT(dsn, connect_timeout=2, sslmode="disable"):
                    return name, dsn
            except psycopg.OperationalError:
                time.sleep(0.4)
        raise RuntimeError("Temporary database did not become ready.")
    except BaseException:
        docker("stop", "--time", "0", name, check=False)
        raise


def install_original_sql(dsn: str) -> None:
    with REAL_CONNECT(dsn, sslmode="disable") as conn:
        with conn.cursor() as cur:
            # Minimal synthetic auth schema/roles so the EXACT production SQL
            # can be applied without a live Supabase project.
            cur.execute("CREATE SCHEMA auth")
            cur.execute("CREATE TABLE auth.users(id uuid PRIMARY KEY)")
            for role in ("anon", "authenticated", "service_role"):
                cur.execute(f"CREATE ROLE {role} NOLOGIN")
            for filename in MIGRATIONS:
                sql = (REPO_ROOT / "docs" / filename).read_text(encoding="utf-8")
                cur.execute(sql)


class RealPostgresCollectorTests(unittest.TestCase):
    """Real collector SQL/Flask routes, but only pretend Auth JWT identities."""

    dsn = ""

    @classmethod
    def setUpClass(cls) -> None:
        cls.alice, cls.bob = str(uuid.uuid4()), str(uuid.uuid4())
        cls.app = Flask("collector_local_staging_only")
        cls.app.testing = True

        def bearer():
            authorization = request.headers.get("Authorization", "")
            return authorization[7:] if authorization.startswith("Bearer ") else None

        def fake_auth(token):
            users = {"synthetic-alice": cls.alice, "synthetic-bob": cls.bob}
            return {"id": users[token]} if token in users else None

        register_collector_routes(
            cls.app, extract_bearer_token=bearer, verify_access_token=fake_auth
        )
        cls.env = patch.dict(os.environ, {
            "COLLECTOR_DATABASE_URL": cls.dsn,
            "COLLECTOR_REDEMPTION_ENABLED": "true",
        })
        cls.env.start()

        def local_only_connect(conninfo, **kwargs):
            if conninfo != cls.dsn:
                raise AssertionError("Attempted to contact a non-staging database!")
            if kwargs.get("sslmode") != "require" or kwargs.get("connect_timeout") != 8:
                raise AssertionError("Production database connection contract changed.")
            # Only test process, only localhost container. Never changes server code.
            return REAL_CONNECT(conninfo, **{**kwargs, "sslmode": "disable"})

        cls.connection_patch = patch.object(
            psycopg, "connect", side_effect=local_only_connect
        )
        cls.connection_patch.start()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.connection_patch.stop()
        cls.env.stop()

    def setUp(self) -> None:
        self.code_017, self.code_023 = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        with REAL_CONNECT(self.dsn, sslmode="disable") as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "TRUNCATE collector_private.reward_entitlements, "
                    "collector_private.plushie_codes, "
                    "collector_private.redemption_attempts, auth.users CASCADE"
                )
                cur.execute(
                    "INSERT INTO auth.users(id) VALUES (%s::uuid), (%s::uuid)",
                    (self.alice, self.bob),
                )
                for serial, code in ((17, self.code_017), (23, self.code_023)):
                    cur.execute(
                        "INSERT INTO collector_private.plushie_codes"
                        "(edition, serial_number, code_hash) "
                        "VALUES ('noras_last_lantern', %s, %s)",
                        (serial, hashlib.sha256(code.encode()).hexdigest()),
                    )

    def post(self, path, code=None, user="synthetic-alice"):
        with self.app.test_client() as client:
            return client.post(
                "/api/collector/" + path,
                json={"code": self.code_017 if code is None else code},
                headers={"Authorization": "Bearer " + user} if user else {},
            )

    def get(self, path, user="synthetic-alice"):
        with self.app.test_client() as client:
            return client.get(
                "/api/collector/" + path,
                headers={"Authorization": "Bearer " + user} if user else {},
            )

    def test_private_roles_and_rls(self):
        with REAL_CONNECT(self.dsn, sslmode="disable") as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT
                      has_schema_privilege('anon','collector_private','USAGE'),
                      has_schema_privilege('authenticated','collector_private','USAGE'),
                      has_function_privilege(
                        'anon','collector_private.claim_castle_017(uuid,text)','EXECUTE'
                      ),
                      has_function_privilege(
                        'authenticated','collector_private.claim_castle_017(uuid,text)','EXECUTE'
                      ),
                      (SELECT bool_and(relrowsecurity) FROM pg_class WHERE oid IN (
                        'collector_private.plushie_codes'::regclass,
                        'collector_private.reward_entitlements'::regclass,
                        'collector_private.redemption_attempts'::regclass))
                """)
                self.assertEqual(cur.fetchone(), (False, False, False, False, True))

    def test_verify_and_non17_no_reward(self):
        verified = self.post("verify")
        self.assertEqual(verified.status_code, 200, verified.json)
        self.assertEqual(verified.json["serial_number"], 17)
        self.assertEqual(verified.json["claim_state"], "available")
        self.assertEqual(verified.headers["Cache-Control"], "no-store, private")
        self.assertNotIn("code_hash", verified.json)
        other = self.post("verify", self.code_023)
        self.assertEqual(other.status_code, 200, other.json)
        self.assertIsNone(other.json["reward_id"])
        self.assertEqual(self.post("redeem", self.code_023).status_code, 400)

    def test_claim_retry_other_account_and_persistent_entitlement(self):
        first = self.post("redeem")
        self.assertEqual(first.status_code, 200, first.json)
        self.assertEqual(first.json["status"], "claimed")
        self.assertEqual(self.post("redeem").json["status"], "already_yours")
        self.assertEqual(self.post("redeem", user="synthetic-bob").status_code, 409)
        # Each request uses a fresh HTTP test client; the state comes from
        # PostgreSQL, not an app/device-local variable.
        own = self.get("entitlements")
        self.assertEqual(own.status_code, 200, own.json)
        self.assertEqual(len(own.json["entitlements"]), 1)
        self.assertEqual(own.json["entitlements"][0]["reward_id"], REWARD)
        self.assertEqual(self.get("entitlements", "synthetic-bob").json["entitlements"], [])
        self.assertEqual(self.post("verify", user="synthetic-bob").json["claim_state"], "claimed")

    def test_deleted_account_leaves_serial_permanently_burned(self):
        self.assertEqual(self.post("redeem").status_code, 200)
        with REAL_CONNECT(self.dsn, sslmode="disable") as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM auth.users WHERE id = %s::uuid", (self.alice,))
                cur.execute(
                    "SELECT claimed_by, claimed_at "
                    "FROM collector_private.plushie_codes WHERE serial_number = 17"
                )
                owner, claimed_at = cur.fetchone()
                self.assertIsNone(owner)
                self.assertIsNotNone(claimed_at)
        self.assertEqual(self.post("verify", user="synthetic-bob").json["claim_state"], "claimed")
        self.assertEqual(self.post("redeem", user="synthetic-bob").status_code, 409)

    def test_shared_attempt_quota(self):
        for _ in range(4):
            self.assertEqual(self.post("verify", "X" * 43).status_code, 400)
        self.assertEqual(self.post("redeem").status_code, 200)
        self.assertEqual(self.post("verify").status_code, 429)
        self.assertEqual(self.post("verify", user="synthetic-bob").status_code, 200)

    def test_simultaneous_claim_only_one_account_wins(self):
        barrier = threading.Barrier(2)

        def claim(user):
            barrier.wait(timeout=10)
            response = self.post("redeem", user=user)
            return response.status_code, response.json

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            futures = [
                pool.submit(claim, user)
                for user in ("synthetic-alice", "synthetic-bob")
            ]
            results = [future.result(timeout=15) for future in futures]
        self.assertEqual(sorted(status for status, _ in results), [200, 409], results)
        with REAL_CONNECT(self.dsn, sslmode="disable") as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT count(*) FROM collector_private.reward_entitlements")
                self.assertEqual(cur.fetchone()[0], 1)

    def test_disabled_verification_and_claim(self):
        with patch.dict(os.environ, {"COLLECTOR_REDEMPTION_ENABLED": "false"}):
            self.assertEqual(self.post("verify").status_code, 503)
            self.assertEqual(self.post("redeem").status_code, 503)
            self.assertEqual(self.get("entitlements").status_code, 200)



def smoke_test_real_qr_browser_flow(dsn: str) -> None:
    """Check QR-scanned fragment URL -> real Flask API -> real PostgreSQL.

    Flask's HTTP test client (rather than a graphical browser) exercises the
    actual local demo landing page and synthetic login. A human iPhone scan
    is still needed to verify the camera and mobile Safari experience.
    """
    import re

    from run_collector_qr_demo import make_demo_app

    # Clear only the runner's disposable Docker database, never Supabase.
    with REAL_CONNECT(dsn, sslmode="disable") as conn:
        with conn.cursor() as cur:
            cur.execute(
                "TRUNCATE collector_private.reward_entitlements, "
                "collector_private.plushie_codes, "
                "collector_private.redemption_attempts, auth.users CASCADE"
            )
    local_ip = "192.168.10.8"  # Fictional RFC1918 host; test client does no networking.
    port = 5057
    base = f"http://{local_ip}:{port}"
    demo = make_demo_app(database_url=dsn, public_ip=local_ip, port=port)

    def local_connect(conninfo, **kwargs):
        if conninfo != dsn or kwargs.get("sslmode") != "require":
            raise AssertionError("QR demo attempted to use a non-isolated database")
        return REAL_CONNECT(conninfo, **{**kwargs, "sslmode": "disable"})

    with patch.dict(os.environ, {
        "COLLECTOR_DATABASE_URL": dsn,
        "COLLECTOR_REDEMPTION_ENABLED": "true",
    }), patch.object(psycopg, "connect", side_effect=local_connect):
        with demo.test_client() as client:
            stage = client.get("/stage", base_url=base)
            assert stage.status_code == 200, stage.status_code
            markup = stage.get_data(as_text=True)
            assert "LOCAL TEST ONLY" in markup
            assert "__NOVA_LOCAL_COLLECTOR_STAGE__ = true" in markup
            assert "__QR_017__" not in markup and "__LINK_017__" not in markup
            assert "data:image/svg+xml;base64," in markup
            codes = re.findall(
                re.escape(base) + r"/collector#code=([A-Za-z0-9_-]{32,128})",
                markup
            )
            assert len(codes) == 2 and codes[0] != codes[1], "Missing QR links"
            qr17, qr23 = codes

            # URL fragments never reach Flask: only the path /collector does.
            certificate = client.get("/collector", base_url=base)
            assert certificate.status_code == 200
            assert certificate.headers["Referrer-Policy"] == "no-referrer"
            scanned_markup = certificate.get_data(as_text=True)
            assert qr17 not in scanned_markup and qr23 not in scanned_markup, (
                "The scanned page leaked an unpresented QR code"
            )
            assert "data:image/svg+xml;base64," not in scanned_markup, (
                "Only the Mac staging launcher may publish QR artwork"
            )

            owner = client.post(
                "/demo/login", json={"identity": "alice"}, base_url=base
            )
            stranger = client.post(
                "/demo/login", json={"identity": "bob"}, base_url=base
            )
            assert owner.status_code == 200 and stranger.status_code == 200
            owner_token, stranger_token = (
                owner.json["token"], stranger.json["token"]
            )
            assert owner_token != stranger_token

            def post(path, token, code):
                return client.post(
                    "/api/collector/" + path, json={"code": code},
                    headers={"Authorization": "Bearer " + token},
                    base_url=base,
                )

            def entitlement(token):
                return client.get(
                    "/api/collector/entitlements",
                    headers={"Authorization": "Bearer " + token},
                    base_url=base,
                )

            first = post("verify", owner_token, qr17)
            assert first.status_code == 200 and first.json["serial_number"] == 17
            assert first.json["claim_state"] == "available"
            claimed = post("redeem", owner_token, qr17)
            assert claimed.status_code == 200 and claimed.json["status"] == "claimed"
            assert any(item["reward_id"] == REWARD for item in entitlement(owner_token).json["entitlements"])
            assert entitlement(stranger_token).json["entitlements"] == []
            denied = post("redeem", stranger_token, qr17)
            assert denied.status_code == 409, denied.json
            after = post("verify", stranger_token, qr17)
            assert after.json["claim_state"] == "claimed"
            other = post("verify", stranger_token, qr23)
            assert other.status_code == 200 and other.json["serial_number"] == 23
            assert other.json["reward_id"] is None
            assert post("redeem", stranger_token, qr23).status_code == 400
            assert entitlement(stranger_token).json["entitlements"] == []
    print("[collector-stage] QR browser/API/PostgreSQL smoke test PASSED")


def main() -> int:
    name = None
    print("[collector-stage] Starting disposable localhost PostgreSQL.")
    try:
        name, dsn = launch_temporary_database()
        print("[collector-stage] Applying the original three private-schema SQL files.")
        install_original_sql(dsn)
        RealPostgresCollectorTests.dsn = dsn
        suite = unittest.defaultTestLoader.loadTestsFromTestCase(
            RealPostgresCollectorTests
        )
        result = unittest.TextTestRunner(verbosity=2).run(suite)
        if not result.wasSuccessful():
            return 1
        print("[collector-stage] Running QR browser-to-real-Postgres smoke test.")
        smoke_test_real_qr_browser_flow(dsn)
        return 0
    except Exception as exc:
        print(f"[collector-stage] Failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    finally:
        if name:
            docker("stop", "--time", "0", name, check=False)
            print("[collector-stage] Isolated container removed; production unchanged.")


if __name__ == "__main__":
    raise SystemExit(main())
