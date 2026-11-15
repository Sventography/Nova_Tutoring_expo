"""Mocked Flask API tests. No production codes, users, or database writes."""
import hashlib
import os
import sys
import types
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

from flask import Flask, request

from collector_redemption import register_collector_routes

USER_A = "00000000-0000-0000-0000-000000000001"
USER_B = "00000000-0000-0000-0000-000000000002"
CODE_017 = "A" * 43
CODE_OTHER = "B" * 43
REWARD = "noras_last_lantern_017"


class MemoryDatabase:
    def __init__(self):
        self.codes = {
            hashlib.sha256(CODE_017.encode()).hexdigest(): [17, None, None],
            hashlib.sha256(CODE_OTHER.encode()).hexdigest(): [23, None, None],
        }
        self.entitlements = {}
        self.attempts = {}

    def connect(self, url, *, connect_timeout, sslmode):
        assert url == "postgresql://mock-only"
        assert sslmode == "require"
        assert connect_timeout == 8
        return Connection(self)


class Connection:
    def __init__(self, db):
        self.db = db

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def cursor(self):
        return Cursor(self.db)


class Cursor:
    def __init__(self, db):
        self.db = db
        self.result = None
        self.results = []

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def execute(self, sql, params):
        if "allow_redemption_attempt" in sql:
            user = params[0]
            self.db.attempts[user] = self.db.attempts.get(user, 0) + 1
            self.result = (self.db.attempts[user] <= 5,)
        elif "select serial_number, claimed_by, claimed_at" in sql:
            item = self.db.codes.get(params[0])
            self.result = tuple(item) if item else None
        elif "claim_castle_017" in sql:
            user, code_hash = params
            item = self.db.codes.get(code_hash)
            if not item or item[0] != 17:
                status = "invalid"
            elif item[2] is not None:
                status = "already_yours" if item[1] == user else "already_claimed"
            elif user in self.db.entitlements:
                status = "already_owned"
            else:
                item[1] = user
                item[2] = datetime.now(timezone.utc)
                self.db.entitlements[user] = (REWARD, datetime.now(timezone.utc))
                status = "claimed"
            self.result = (status,)
        elif "from collector_private.reward_entitlements" in sql:
            user, reward = params
            record = self.db.entitlements.get(user)
            self.results = [record] if record and record[0] == reward else []
        else:
            raise AssertionError("Unexpected SQL: " + sql)

    def fetchone(self):
        return self.result

    def fetchall(self):
        return self.results


class CollectorRoutesTest(unittest.TestCase):
    def setUp(self):
        self.db = MemoryDatabase()
        self.env = patch.dict(os.environ, {
            "COLLECTOR_REDEMPTION_ENABLED": "true",
            "COLLECTOR_DATABASE_URL": "postgresql://mock-only",
        })
        self.env.start()
        self.psycopg = patch.dict(
            sys.modules, {"psycopg": types.SimpleNamespace(connect=self.db.connect)}
        )
        self.psycopg.start()
        app = Flask(__name__)
        register_collector_routes(
            app,
            extract_bearer_token=lambda: (request.headers.get("Authorization", "")
                                           .removeprefix("Bearer ") or None),
            verify_access_token=lambda token: {
                "id": USER_A if token == "alice" else USER_B if token == "bob" else None
            },
        )
        app.testing = True
        self.client = app.test_client()

    def tearDown(self):
        self.psycopg.stop()
        self.env.stop()

    def post(self, path, code=CODE_017, token="alice"):
        return self.client.post(
            "/api/collector/" + path,
            json={"code": code},
            headers={"Authorization": "Bearer " + token} if token else {},
        )

    def get(self, path, token="alice"):
        return self.client.get(
            "/api/collector/" + path,
            headers={"Authorization": "Bearer " + token} if token else {},
        )

    def test_authentication_is_required(self):
        self.assertEqual(self.post("verify", token="").status_code, 401)
        self.assertEqual(self.post("redeem", token="").status_code, 401)
        self.assertEqual(self.get("entitlements", token="").status_code, 401)

    def test_disabled_claims_fail_closed(self):
        with patch.dict(os.environ, {"COLLECTOR_REDEMPTION_ENABLED": "false"}):
            self.assertEqual(self.post("verify").status_code, 503)
            self.assertEqual(self.post("redeem").status_code, 503)

    def test_verified_certificate_and_no_cache(self):
        response = self.post("verify")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["serial_number"], 17)
        self.assertEqual(response.json["edition_size"], 100)
        self.assertEqual(response.json["claim_state"], "available")
        self.assertEqual(response.headers["Cache-Control"], "no-store, private")
        self.assertEqual(response.headers["Referrer-Policy"], "no-referrer")

    def test_claim_is_permanent_idempotent_and_account_bound(self):
        self.assertEqual(self.post("redeem").json["status"], "claimed")
        self.assertEqual(self.post("redeem").json["status"], "already_yours")
        self.assertEqual(self.post("redeem", token="bob").status_code, 409)
        self.assertEqual(len(self.db.entitlements), 1)

    def test_account_deletion_does_not_reissue_the_serial(self):
        self.assertEqual(self.post("redeem").status_code, 200)
        item = self.db.codes[hashlib.sha256(CODE_017.encode()).hexdigest()]
        item[1] = None  # Auth FK anonymizes owner on account deletion.
        self.db.entitlements.clear()  # Owner's entitlement cascades away.
        self.assertIsNotNone(item[2])  # The physical serial stays spent.
        verified = self.post("verify", token="bob")
        self.assertEqual(verified.status_code, 200)
        self.assertEqual(verified.json["claim_state"], "claimed")
        self.assertEqual(self.post("redeem", token="bob").status_code, 409)

    def test_authenticity_tracks_claimed_state_without_exposing_owner(self):
        self.assertEqual(self.post("redeem").status_code, 200)
        owner = self.post("verify", token="alice")
        stranger = self.post("verify", token="bob")
        self.assertEqual(owner.status_code, 200)
        self.assertEqual(owner.json["claim_state"], "yours")
        self.assertEqual(stranger.json["claim_state"], "claimed")
        for response in (owner, stranger):
            self.assertNotIn("claimed_by", response.json)
            self.assertNotIn("code_hash", response.json)
            self.assertNotIn("user_id", response.json)

    def test_disabled_endpoints_do_not_consume_attempts(self):
        with patch.dict(os.environ, {"COLLECTOR_REDEMPTION_ENABLED": "false"}):
            self.assertEqual(self.post("verify").status_code, 503)
            self.assertEqual(self.post("redeem").status_code, 503)
        self.assertEqual(self.db.attempts, {})

    def test_inventory_is_only_for_authenticated_owner(self):
        self.post("redeem")
        owner = self.get("entitlements", "alice")
        other = self.get("entitlements", "bob")
        self.assertEqual(owner.json["entitlements"][0]["reward_id"], REWARD)
        self.assertEqual(other.json["entitlements"], [])

    def test_non_seventeen_item_never_awards_castle(self):
        verified = self.post("verify", CODE_OTHER)
        self.assertEqual(verified.json["serial_number"], 23)
        self.assertIsNone(verified.json["reward_id"])
        self.assertEqual(self.post("redeem", CODE_OTHER).status_code, 400)
        self.assertFalse(self.db.entitlements)

    def test_bad_codes_are_rejected(self):
        self.assertEqual(self.post("verify", "short").status_code, 400)
        self.assertEqual(self.post("redeem", "short").status_code, 400)
        self.assertEqual(self.post("verify", "C" * 43).status_code, 400)
        self.assertEqual(self.post("verify", "X" * 129).status_code, 400)
        self.assertEqual(self.post("verify", "../" + "a" * 40).status_code, 400)
        self.assertEqual(self.post("verify", " " + "A" * 43).status_code, 400)

    def test_claim_attempts_share_limit_with_verifications(self):
        for _ in range(4):
            self.assertEqual(self.post("verify", "C" * 43).status_code, 400)
        self.assertEqual(self.post("redeem").status_code, 200)
        self.assertEqual(self.post("redeem").status_code, 429)
        self.assertEqual(self.db.attempts[USER_A], 6)

    def test_atomic_account_attempt_limit(self):
        for _ in range(5):
            self.assertEqual(self.post("verify", "C" * 43).status_code, 400)
        self.assertEqual(self.post("verify", "C" * 43).status_code, 429)
        self.assertEqual(self.db.attempts[USER_A], 6)
        self.assertEqual(self.post("verify", token="bob").status_code, 200)

    def test_database_missing_does_not_award(self):
        with patch.dict(os.environ, {"COLLECTOR_DATABASE_URL": ""}):
            self.assertEqual(self.post("redeem").status_code, 503)
            self.assertEqual(self.get("entitlements").status_code, 503)
        self.assertFalse(self.db.entitlements)


if __name__ == "__main__":
    unittest.main()
