"""Server-only collector QR redemption routes.

Requires COLLECTOR_REDEMPTION_ENABLED=true and a server-side PostgreSQL
connection string in COLLECTOR_DATABASE_URL. Never ship that URL to clients.
The private SQL schema must be reviewed/applied before enabling this route.
"""
import hashlib
import os
import re
from flask import jsonify, request

REWARD_ID = "noras_last_lantern_017"
CODE_PATTERN = re.compile(r"^[A-Za-z0-9_-]{32,128}$")


def register_collector_routes(app, *, extract_bearer_token, verify_access_token):
    def authenticated_user():
        token = extract_bearer_token()
        if not token:
            return None
        user = verify_access_token(token)
        return user if isinstance(user, dict) and user.get("id") else None

    @app.post("/api/collector/redeem")
    def redeem_collector():
        user = authenticated_user()
        if not user:
            return jsonify(ok=False, error="unauthorized"), 401
        if os.getenv("COLLECTOR_REDEMPTION_ENABLED", "").lower() != "true":
            return jsonify(ok=False, error="redemption_not_enabled"), 503

        body = request.get_json(silent=True) or {}
        code = body.get("code")
        if not isinstance(code, str) or not CODE_PATTERN.fullmatch(code):
            return jsonify(ok=False, error="invalid_code"), 400

        database_url = os.getenv("COLLECTOR_DATABASE_URL", "").strip()
        if not database_url:
            return jsonify(ok=False, error="redemption_not_configured"), 503

        # Lazy import keeps existing app startup working before deployment.
        import psycopg
        code_hash = hashlib.sha256(code.encode("utf-8")).hexdigest()
        try:
            with psycopg.connect(database_url, connect_timeout=8) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "select collector_private.claim_castle_017(%s::uuid, %s::text)",
                        (user["id"], code_hash),
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
