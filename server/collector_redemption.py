"""Private collector QR verification, redemption, and ownership APIs.

No generated codes live in the app or this repository. All decisions come from
the private Supabase PostgreSQL tables. This module is registered on the Flask
server but claims stay disabled until explicitly enabled in Render.
"""
import hashlib
import os
import re

from flask import jsonify, request

REWARD_ID = "noras_last_lantern_017"
CODE_PATTERN = re.compile(r"^[A-Za-z0-9_-]{32,128}$")
LIMITED_EDITION_SIZE = 100


def register_collector_routes(app, *, extract_bearer_token, verify_access_token):
    def _account_id():
        token = extract_bearer_token()
        if not token:
            return None
        user = verify_access_token(token)
        return str(user["id"]) if isinstance(user, dict) and user.get("id") else None

    def _connect():
        # Never use a client-visible EXPO_PUBLIC_* environment variable here.
        database_url = os.getenv("COLLECTOR_DATABASE_URL", "").strip()
        if not database_url:
            return None
        import psycopg
        return psycopg.connect(database_url, connect_timeout=8, sslmode="require")

    def _code_from_json():
        if request.content_length is not None and request.content_length > 2048:
            return None
        if not request.is_json:
            return None
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return None
        code = payload.get("code")
        return code if isinstance(code, str) and CODE_PATTERN.fullmatch(code) else None

    def _admit_attempt(cur, account_id):
        # Atomic PostgreSQL upsert handles multiple Render workers/instances.
        cur.execute(
            "select collector_private.allow_redemption_attempt(%s::uuid)",
            (account_id,),
        )
        return bool(cur.fetchone()[0])

    @app.after_request
    def _collector_no_store(response):
        if request.path.startswith("/api/collector/"):
            response.headers["Cache-Control"] = "no-store, private"
            response.headers["Referrer-Policy"] = "no-referrer"
            response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.get("/api/collector/entitlements")
    def collector_entitlements():
        try:
            account_id = _account_id()
        except Exception:
            app.logger.exception("Collector account verification unavailable")
            return jsonify(ok=False, error="authentication_unavailable"), 503
        if not account_id:
            return jsonify(ok=False, error="unauthorized"), 401

        try:
            conn = _connect()
            if conn is None:
                return jsonify(ok=False, error="redemption_not_configured"), 503
            with conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """select reward_id, granted_at
                           from collector_private.reward_entitlements
                           where user_id = %s::uuid and reward_id = %s""",
                        (account_id, REWARD_ID),
                    )
                    records = cur.fetchall()
            return jsonify(ok=True, entitlements=[
                {"reward_id": reward, "granted_at": granted.isoformat()}
                for reward, granted in records
            ])
        except Exception:
            app.logger.exception("Collector ownership lookup failed")
            return jsonify(ok=False, error="redemption_unavailable"), 503

    @app.post("/api/collector/verify")
    def verify_collector():
        try:
            account_id = _account_id()
        except Exception:
            app.logger.exception("Collector account verification unavailable")
            return jsonify(ok=False, error="authentication_unavailable"), 503
        if not account_id:
            return jsonify(ok=False, error="unauthorized"), 401
        if os.getenv("COLLECTOR_REDEMPTION_ENABLED", "").lower() != "true":
            return jsonify(ok=False, error="redemption_not_enabled"), 503

        code = _code_from_json()
        if code is None:
            return jsonify(ok=False, error="invalid_code"), 400
        try:
            conn = _connect()
            if conn is None:
                return jsonify(ok=False, error="redemption_not_configured"), 503
            with conn:
                with conn.cursor() as cur:
                    if not _admit_attempt(cur, account_id):
                        return jsonify(ok=False, error="too_many_attempts"), 429
                    cur.execute(
                        """select serial_number, claimed_by, claimed_at
                           from collector_private.plushie_codes
                           where code_hash = %s""",
                        (hashlib.sha256(code.encode("utf-8")).hexdigest(),),
                    )
                    item = cur.fetchone()
            if not item:
                return jsonify(ok=False, error="invalid_code"), 400
            serial, claimed_by, claimed_at = item
            # Physical serials remain burned after account deletion: the Auth
            # FK anonymizes claimed_by, but claimed_at stays populated.
            # Do not advertise an irreversibly spent QR as available.
            claim_state = (
                "available" if claimed_at is None
                else "yours" if claimed_by is not None and str(claimed_by) == account_id
                else "claimed"
            )
            return jsonify(
                ok=True, authentic=True, edition="noras_last_lantern",
                serial_number=serial, edition_size=LIMITED_EDITION_SIZE,
                claim_state=claim_state,
                reward_id=REWARD_ID if serial == 17 else None,
            )
        except Exception:
            app.logger.exception("Collector authenticity lookup failed")
            return jsonify(ok=False, error="redemption_unavailable"), 503

    @app.post("/api/collector/redeem")
    def redeem_collector():
        try:
            account_id = _account_id()
        except Exception:
            app.logger.exception("Collector account verification unavailable")
            return jsonify(ok=False, error="authentication_unavailable"), 503
        if not account_id:
            return jsonify(ok=False, error="unauthorized"), 401
        if os.getenv("COLLECTOR_REDEMPTION_ENABLED", "").lower() != "true":
            return jsonify(ok=False, error="redemption_not_enabled"), 503

        code = _code_from_json()
        if code is None:
            return jsonify(ok=False, error="invalid_code"), 400
        try:
            conn = _connect()
            if conn is None:
                return jsonify(ok=False, error="redemption_not_configured"), 503
            with conn:
                with conn.cursor() as cur:
                    if not _admit_attempt(cur, account_id):
                        return jsonify(ok=False, error="too_many_attempts"), 429
                    cur.execute(
                        "select collector_private.claim_castle_017(%s::uuid, %s::text)",
                        (account_id, hashlib.sha256(code.encode("utf-8")).hexdigest()),
                    )
                    status = cur.fetchone()[0]
            if status in ("claimed", "already_yours"):
                return jsonify(ok=True, status=status, reward_id=REWARD_ID)
            if status in ("already_claimed", "already_owned"):
                return jsonify(ok=False, error=status), 409
            return jsonify(ok=False, error="invalid_code"), 400
        except Exception:
            app.logger.exception("Collector redemption failed")
            return jsonify(ok=False, error="redemption_unavailable"), 503
