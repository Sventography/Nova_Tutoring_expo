"""Explicitly seed ONLY a distinct collector-staging Supabase project.

This script refuses Nova production/old project refs and refuses to overwrite
existing staging serials. It generates disposable random QR secrets locally.
Never paste the codes into GitHub issues, public chats or production artwork.

Example (after staging SQL is applied):
  cd server
  python collector_staging_seed.py --web-origin https://your-staging-web.example

Environment (do NOT commit):
  COLLECTOR_STAGING_SUPABASE_URL=https://<unique-staging-ref>.supabase.co
  COLLECTOR_STAGING_DATABASE_URL=postgresql://<staging-only-user>:<password>@...
"""
from __future__ import annotations

import argparse
import hashlib
import os
import secrets
import sys
from urllib.parse import urlparse

import psycopg

from collector_staging_server import staging_project_and_database


def safe_web_origin(raw: str) -> str:
    parsed = urlparse(raw)
    if parsed.username or parsed.password or parsed.path not in ("", "/"):
        raise ValueError("Only an origin (scheme + hostname) is allowed.")
    if parsed.query or parsed.fragment or not parsed.hostname:
        raise ValueError("A complete staging web origin is required.")
    if parsed.scheme == "https":
        return raw.rstrip("/")
    if parsed.scheme == "http" and parsed.hostname in ("localhost", "127.0.0.1"):
        return raw.rstrip("/")
    raise ValueError(
        "Staging QR links must use HTTPS, or localhost for a Mac-only test."
    )


def seed_one_time_codes(auth_url: str, database_url: str, web_origin: str):
    project_ref = staging_project_and_database(auth_url, database_url)
    origin = safe_web_origin(web_origin)
    # token_urlsafe(32): ~256 bits entropy; code hash is stored, not the token.
    codes = {17: secrets.token_urlsafe(32), 23: secrets.token_urlsafe(32)}

    with psycopg.connect(database_url, connect_timeout=8, sslmode="require") as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM collector_private.plushie_codes")
            existing = cur.fetchone()[0]
            if existing != 0:
                raise RuntimeError(
                    "Refusing to add or replace codes: staging already has "
                    f"{existing} collector record(s). No changes were made."
                )
            for serial, code in codes.items():
                cur.execute(
                    """INSERT INTO collector_private.plushie_codes
                    (edition, serial_number, code_hash)
                    VALUES ('noras_last_lantern', %s, %s)""",
                    (serial, hashlib.sha256(code.encode("utf-8")).hexdigest()),
                )

    return project_ref, {
        serial: f"{origin}/collector#code={code}"
        for serial, code in codes.items()
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Create two disposable QR codes in a verified staging-only Supabase DB."
    )
    parser.add_argument(
        "--web-origin", required=True,
        help="HTTPS origin of the separate staging Expo web app, or localhost for Mac-only use."
    )
    args = parser.parse_args()
    auth_url = os.getenv("COLLECTOR_STAGING_SUPABASE_URL", "").strip()
    database_url = os.getenv("COLLECTOR_STAGING_DATABASE_URL", "").strip()
    if not auth_url or not database_url:
        parser.error("Staging-only Supabase URL and PostgreSQL connection are required.")
    if os.getenv("COLLECTOR_DATABASE_URL"):
        parser.error("Unset COLLECTOR_DATABASE_URL before running this staging seeder.")
    try:
        ref, links = seed_one_time_codes(auth_url, database_url, args.web_origin)
    except Exception as exc:
        print(
            f"[collector-stage-seed] Failed: {type(exc).__name__}: {exc}",
            file=sys.stderr,
        )
        return 1
    print(f"[collector-stage-seed] Created two TEST-ONLY QR records in project {ref}.")
    print("DO NOT share these URLs or make physical QR artwork from them.")
    print("STAGING 017 LINK:", links[17])
    print("STAGING 023 LINK:", links[23])
    print("Only the 017 code can grant the staged castle. Do not commit this output.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
