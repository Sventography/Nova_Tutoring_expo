"""Real-Auth staging bridge tests with mocked Supabase HTTP and PostgreSQL.

These check URL/project isolation and that the backend trusts an Auth response
(not a client-provided ID). They DO NOT claim real Supabase Auth was exercised.
"""
from __future__ import annotations

import os
import sys
import unittest
from unittest.mock import patch

import psycopg

from collector_staging_server import create_app, staging_project_and_database
from test_collector_redemption import (
    CODE_017, CODE_OTHER, USER_A, USER_B,
    Connection, MemoryDatabase,
)

STAGE_REF = "abcdefghijklmnopqrst"  # Fictional 20-character staging project
STAGE_AUTH = f"https://{STAGE_REF}.supabase.co"
STAGE_DB = f"postgresql://postgres:fake@db.{STAGE_REF}.supabase.co:5432/postgres"
OTHER_DB = "postgresql://postgres:fake@db.zzzzzzzzzzzzzzzzzzzz.supabase.co:5432/postgres"


class FakeSupabaseAuthResponse:
    def __init__(self, user_id=None, status_code=200):
        self.user_id = user_id
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError("Staging Auth lookup failed")

    def json(self):
        return {"id": self.user_id} if self.user_id else {}


class StagingServerConfigTests(unittest.TestCase):
    def test_real_supabase_project_and_database_match(self):
        self.assertEqual(
            staging_project_and_database(STAGE_AUTH, STAGE_DB), STAGE_REF
        )

    def test_pooler_login_must_contain_staging_project(self):
        valid_pooler = (
            f"postgresql://postgres.{STAGE_REF}:fake"
            "@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
        )
        self.assertEqual(
            staging_project_and_database(STAGE_AUTH, valid_pooler), STAGE_REF
        )
        with self.assertRaises(ValueError):
            staging_project_and_database(
                STAGE_AUTH, valid_pooler.replace(STAGE_REF, "owlbqyiqsyfcrpqqfacp")
            )

    def test_refuses_both_actual_nova_projects(self):
        for ref in ("owlbqyiqsyfcrpqqfacp", "zgrixkqcowitlygbvrlw"):
            with self.subTest(ref=ref), self.assertRaises(ValueError):
                staging_project_and_database(
                    f"https://{ref}.supabase.co",
                    f"postgresql://postgres:fake@db.{ref}.supabase.co:5432/postgres",
                )

    def test_refuses_mismatched_database_or_unencrypted_auth(self):
        with self.assertRaises(ValueError):
            staging_project_and_database(STAGE_AUTH, OTHER_DB)
        with self.assertRaises(ValueError):
            staging_project_and_database("http://" + STAGE_REF + ".supabase.co", STAGE_DB)
        with self.assertRaises(ValueError):
            staging_project_and_database(
                STAGE_AUTH, STAGE_DB + "?sslmode=disable"
            )

    def test_refuses_missing_credentials_and_inherited_collector_database(self):
        with patch.dict(os.environ, {
            "COLLECTOR_STAGING_SUPABASE_URL": "",
            "COLLECTOR_STAGING_PUBLISHABLE_KEY": "",
            "COLLECTOR_STAGING_DATABASE_URL": "",
            "COLLECTOR_DATABASE_URL": "",
        }):
            with self.assertRaises(RuntimeError):
                create_app()
        with patch.dict(os.environ, {
            "COLLECTOR_STAGING_SUPABASE_URL": STAGE_AUTH,
            "COLLECTOR_STAGING_PUBLISHABLE_KEY": "sb_publishable_fake",
            "COLLECTOR_STAGING_DATABASE_URL": STAGE_DB,
            "COLLECTOR_DATABASE_URL": "postgresql://unsafe-production",
        }):
            with self.assertRaises(RuntimeError):
                create_app()


class StagingServerBearerAuthTests(unittest.TestCase):
    def setUp(self):
        self.db = MemoryDatabase()
        self.env = patch.dict(os.environ, {
            "COLLECTOR_STAGING_SUPABASE_URL": STAGE_AUTH,
            "COLLECTOR_STAGING_PUBLISHABLE_KEY": "sb_publishable_fake",
            "COLLECTOR_STAGING_DATABASE_URL": STAGE_DB,
            "COLLECTOR_STAGING_WEB_ORIGINS": "https://staging.example.test",
            "COLLECTOR_DATABASE_URL": "",
        })
        self.env.start()

        def mock_connect(conninfo, **kwargs):
            if conninfo != STAGE_DB or kwargs.get("sslmode") != "require":
                raise AssertionError("Staging collector attempted a different database.")
            return Connection(self.db)

        self.psycopg = patch.object(psycopg, "connect", side_effect=mock_connect)
        self.psycopg.start()

        def mock_auth_get(url, headers=None, timeout=None):
            self.assertEqual(url, STAGE_AUTH + "/auth/v1/user")
            self.assertEqual(headers.get("apikey"), "sb_publishable_fake")
            self.assertEqual(timeout, 10)
            token = headers.get("Authorization", "").removeprefix("Bearer ")
            if token == "staging-owner":
                return FakeSupabaseAuthResponse(USER_A)
            if token == "staging-other":
                return FakeSupabaseAuthResponse(USER_B)
            return FakeSupabaseAuthResponse(status_code=401)

        self.auth = patch(
            "collector_staging_server.requests.get", side_effect=mock_auth_get
        )
        self.auth.start()
        self.app = create_app()
        self.app.testing = True
        self.client = self.app.test_client()

    def tearDown(self):
        self.auth.stop()
        self.psycopg.stop()
        self.env.stop()

    def post(self, path, token="staging-owner", code=CODE_017):
        return self.client.post(
            "/api/collector/" + path,
            json={"code": code},
            headers={
                "Authorization": f"Bearer {token}",
                "Origin": "https://staging.example.test",
            },
        )

    def get(self, token="staging-owner"):
        return self.client.get(
            "/api/collector/entitlements",
            headers={"Authorization": f"Bearer {token}"},
        )

    def test_real_auth_bridge_sends_bearer_to_staging_auth(self):
        verified = self.post("verify")
        self.assertEqual(verified.status_code, 200)
        self.assertEqual(verified.json["serial_number"], 17)
        self.assertEqual(
            verified.headers.get("Access-Control-Allow-Origin"),
            "https://staging.example.test",
        )

    def test_no_token_or_invalid_token_cannot_claim(self):
        self.assertEqual(self.post("redeem", token="unknown").status_code, 401)
        self.assertEqual(
            self.client.post(
                "/api/collector/redeem",
                json={"code": CODE_017, "user_id": USER_A},
            ).status_code, 401
        )
        self.assertFalse(self.db.entitlements)

    def test_staging_auth_account_owns_castle_and_other_is_rejected(self):
        self.assertEqual(self.post("redeem").status_code, 200)
        self.assertEqual(self.post("redeem", token="staging-other").status_code, 409)
        self.assertEqual(len(self.get().json["entitlements"]), 1)
        self.assertEqual(self.get("staging-other").json["entitlements"], [])

    def test_staging_health_and_disallowed_origin(self):
        status = self.client.get("/staging/health")
        self.assertEqual(status.json["mode"], "isolated_collector_staging")
        self.assertEqual(status.json["project_ref"], STAGE_REF)
        denied = self.client.post(
            "/api/collector/verify",
            json={"code": CODE_OTHER},
            headers={
                "Authorization": "Bearer staging-owner",
                "Origin": "https://stranger.example.test",
            },
        )
        self.assertNotIn("Access-Control-Allow-Origin", denied.headers)


if __name__ == "__main__":
    unittest.main()
