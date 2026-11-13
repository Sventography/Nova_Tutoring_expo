"""Standalone *real-Auth* collector staging API. NEVER deploy as production.

Requires a distinct staging Supabase project and its staging-only database.
Validates that the Auth project reference matches the database host/login so
production auth or collector tables cannot be used accidentally. Registered
routes are the SAME production Flask collector routes and private SQL claims.

Run only after setting required staging environment variables (see docs):
    cd server
    gunicorn 'collector_staging_server:create_app()' --bind 127.0.0.1:5059

For an HTTPS staging service, bind the service port through your platform's
TLS proxy. No QR codes or real customer accounts are ever inserted here.
"""
from __future__ import annotations

import os
import re
from urllib.parse import urlparse
from uuid import UUID

import requests
from flask import Flask, jsonify, request
from flask_cors import CORS

from collector_redemption import register_collector_routes

_PRODUCTION_REFS = {"owlbqyiqsyfcrpqqfacp", "zgrixkqcowitlygbvrlw"}
_PROJECT_REF_PATTERN = re.compile(r"^[a-z0-9]{20}$")


def staging_project_and_database(supabase_url: str, database_url: str) -> str:
    """Fail closed unless both endpoints belong to one non-production project."""
    auth = urlparse(supabase_url)
    if auth.scheme != "https" or auth.port or auth.username or auth.password or auth.query or auth.fragment:
        raise ValueError("Staging Auth must be an HTTPS Supabase project URL.")
    if not auth.hostname or not auth.hostname.endswith(".supabase.co"):
        raise ValueError("Staging Auth must use a dedicated *.supabase.co project.")
    ref = auth.hostname.removesuffix(".supabase.co")
    if not _PROJECT_REF_PATTERN.fullmatch(ref) or ref in _PRODUCTION_REFS:
        raise ValueError("Refusing live/former Nova Auth project for collector staging.")
    if auth.path not in ("", "/"):
        raise ValueError("Staging Auth URL must not include a path.")

    db = urlparse(database_url)
    if db.scheme not in ("postgres", "postgresql") or not db.hostname or not db.username:
        raise ValueError("Staging database requires a PostgreSQL connection URL.")
    if db.fragment:
        raise ValueError("Database connection URL may not have a fragment.")
    # Direct Supabase connections use db.<ref>.supabase.co with postgres.
    # Connection poolers use postgres.<ref> as the username.
    direct = db.hostname == f"db.{ref}.supabase.co" and db.username == "postgres"
    pooler = db.hostname.endswith(".pooler.supabase.com") and db.username == f"postgres.{ref}"
    if not (direct or pooler):
        raise ValueError("Staging database must match this Auth project's ref.")
    if not db.password:
        raise ValueError("Staging database credentials are missing.")
    if db.query and any(
        parameter.split("=", 1)[0].lower() == "sslmode" and parameter.split("=", 1)[-1].lower() == "disable"
        for parameter in db.query.split("&")
    ):
        raise ValueError("Staging database may not disable TLS.")
    return ref


def _origins() -> list[str]:
    raw = os.getenv("COLLECTOR_STAGING_WEB_ORIGINS", "").strip()
    origins = [
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:19006",
        "http://127.0.0.1:19006",
    ]
    if raw:
        for origin in raw.split(","):
            value = origin.strip().rstrip("/")
            parsed = urlparse(value)
            if value == "*" or parsed.scheme not in ("https", "http") or not parsed.hostname:
                raise ValueError("Invalid staging origin.")
            if parsed.scheme != "https" and parsed.hostname not in ("localhost", "127.0.0.1"):
                raise ValueError("Staging HTTP origins must use loopback only.")
            if parsed.path or parsed.query or parsed.fragment:
                raise ValueError("Staging origin must contain only scheme and host/port.")
            origins.append(value)
    return sorted(set(origins))


def create_app() -> Flask:
    auth_url = os.getenv("COLLECTOR_STAGING_SUPABASE_URL", "").strip().rstrip("/")
    publishable_key = os.getenv("COLLECTOR_STAGING_PUBLISHABLE_KEY", "").strip()
    database_url = os.getenv("COLLECTOR_STAGING_DATABASE_URL", "").strip()
    if not (auth_url and publishable_key and database_url):
        raise RuntimeError(
            "Missing COLLECTOR_STAGING_SUPABASE_URL, "
            "COLLECTOR_STAGING_PUBLISHABLE_KEY or "
            "COLLECTOR_STAGING_DATABASE_URL."
        )
    ref = staging_project_and_database(auth_url, database_url)
    # Never inherit a production database URL, and set the single collector DB
    # variable only after its staging project has been validated.
    if os.getenv("COLLECTOR_DATABASE_URL"):
        raise RuntimeError(
            "COLLECTOR_DATABASE_URL must be unset for the staging-only server."
        )
    os.environ["COLLECTOR_DATABASE_URL"] = database_url
    os.environ["COLLECTOR_REDEMPTION_ENABLED"] = "true"

    app = Flask("nova_collector_real_auth_staging")
    app.config["MAX_CONTENT_LENGTH"] = 2048
    CORS(
        app, resources={r"/api/collector/*": {"origins": _origins()}},
        methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    def extract_token():
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.lower().startswith("bearer "):
            return None
        token = auth_header[7:].strip()
        return token or None

    def verify_token(token: str):
        # Supabase Auth must verify this JWT's CURRENT user. Do not decode a
        # user ID from an unverified JWT or accept the client-provided user_id.
        response = requests.get(
            f"{auth_url}/auth/v1/user",
            headers={
                "apikey": publishable_key,
                "Authorization": f"Bearer {token}",
            },
            timeout=10,
        )
        if response.status_code in (400, 401, 403):
            return None
        response.raise_for_status()
        user = response.json()
        if not isinstance(user, dict):
            return None
        try:
            verified_id = str(UUID(str(user["id"])))
        except (ValueError, KeyError, TypeError, AttributeError):
            return None
        return {"id": verified_id}

    register_collector_routes(
        app,
        extract_bearer_token=extract_token,
        verify_access_token=verify_token,
    )

    @app.get("/staging/health")
    def staging_health():
        return jsonify(ok=True, mode="isolated_collector_staging", project_ref=ref)

    @app.after_request
    def security_headers(response):
        response.headers["X-Robots-Tag"] = "noindex, nofollow, noarchive"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Cache-Control"] = "private, no-store"
        return response

    return app


if __name__ == "__main__":
    # The app does not expose an arbitrary 0.0.0.0 plaintext listener
    # for real JWTs; use HTTPS termination at a separate staging service.
    create_app().run(host="127.0.0.1", port=5059, debug=False)
