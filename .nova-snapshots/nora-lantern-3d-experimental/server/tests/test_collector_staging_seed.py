"""Safe seed guard tests. No real Supabase/database/QR data used."""
from __future__ import annotations

import hashlib
import unittest
from unittest.mock import patch

import collector_staging_seed as seed
from test_collector_staging_server import STAGE_AUTH, STAGE_DB

class StubCursor:
    def __init__(self, existing=0):
        self.existing = existing
        self.calls = []

    def __enter__(self): return self
    def __exit__(self, *_): return False
    def execute(self, sql, params=None): self.calls.append((sql, params))
    def fetchone(self): return (self.existing,)


class StubConnection:
    def __init__(self, cursor): self.cursor_value = cursor
    def __enter__(self): return self
    def __exit__(self, *_): return False
    def cursor(self): return self.cursor_value


class CollectorStagingSeedTests(unittest.TestCase):
    def test_staging_only_two_disposable_codes_and_only_hashes_in_database(self):
        cursor = StubCursor()
        def connect(*args, **kwargs):
            self.assertEqual(args, (STAGE_DB,))
            self.assertEqual(kwargs["sslmode"], "require")
            return StubConnection(cursor)

        with patch.object(seed.psycopg, "connect", side_effect=connect):
            ref, links = seed.seed_one_time_codes(
                STAGE_AUTH, STAGE_DB, "https://collector-stage.example.test"
            )
        self.assertEqual(ref, "abcdefghijklmnopqrst")
        self.assertEqual(set(links), {17, 23})
        self.assertNotEqual(links[17], links[23])
        self.assertIn("/collector#code=", links[17])
        self.assertEqual(len(cursor.calls), 3)
        for serial, (_, args) in zip([17, 23], cursor.calls[1:]):
            self.assertEqual(args[0], serial)
            self.assertEqual(len(args[1]), 64)
            token = links[serial].split("#code=", 1)[1]
            self.assertEqual(hashlib.sha256(token.encode()).hexdigest(), args[1])
            self.assertNotIn(token, str(cursor.calls))

    def test_refuses_production_auth_without_touching_database(self):
        with patch.object(seed.psycopg, "connect") as connect:
            with self.assertRaises(ValueError):
                seed.seed_one_time_codes(
                    "https://owlbqyiqsyfcrpqqfacp.supabase.co",
                    STAGE_DB,
                    "https://stage.example.test",
                )
            connect.assert_not_called()

    def test_refuses_existing_codes_and_never_overwrites_serials(self):
        cursor = StubCursor(existing=1)
        with patch.object(seed.psycopg, "connect", return_value=StubConnection(cursor)):
            with self.assertRaises(RuntimeError):
                seed.seed_one_time_codes(
                    STAGE_AUTH, STAGE_DB, "https://stage.example.test"
                )
        self.assertEqual(len(cursor.calls), 1)

    def test_never_generates_plaintext_lan_or_production_qr_links(self):
        for origin in (
            "http://192.168.1.74:8081",
            "http://10.0.0.2",
            "ftp://stage.example.test",
            "https://user:secret@stage.example.test",
            "https://stage.example.test/path",
        ):
            with self.subTest(origin=origin), self.assertRaises(ValueError):
                seed.safe_web_origin(origin)
        self.assertEqual(
            seed.safe_web_origin("http://localhost:8081"),
            "http://localhost:8081",
        )

if __name__ == "__main__":
    unittest.main()
