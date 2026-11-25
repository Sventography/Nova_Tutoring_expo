"""Account-bound claim for the Chapter 1 story reward, separate from physical QR redemption."""
import os
import re

import requests
from flask import jsonify, request


def _normalize(value):
    if not isinstance(value, str):
        return ""
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def register_archive_routes(app, *, extract_bearer_token, verify_access_token, headers_for_service, rpc_url, verify_completion_evidence=None):
    def result(status, http_status=200):
        response = jsonify(status=status)
        response.headers["Cache-Control"] = "no-store, private"
        return response, http_status

    def account_id():
        token = extract_bearer_token()
        user = verify_access_token(token) if token else None
        if not isinstance(user, dict) or user.get("is_anonymous") is True:
            return None
        return user.get("id")

    @app.post("/api/archive/complete")
    def archive_complete():
        # Fixed client phrases are not proof of completion. Fail closed until a
        # trusted, account-bound server verifier is wired into this route.
        if verify_completion_evidence is None or os.getenv("NOVA_ARCHIVE_REWARDS_ENABLED", "").lower() != "true":
            return result("closed", 503)
        if not request.is_json or (request.content_length or 0) > 1024:
            return result("invalid_evidence", 400)
        data = request.get_json(silent=True)
        if not isinstance(data, dict) or (
            _normalize(data.get("recovered")) != "unerased first draft"
            or _normalize(data.get("prompt")) != "ask nova what she got wrong"
        ):
            return result("invalid_evidence", 400)

        try:
            user_id = account_id()
            if not user_id:
                return result("unauthorized", 401)
            if verify_completion_evidence(user_id) is not True:
                return result("invalid_evidence", 403)
            headers = headers_for_service({"Content-Type": "application/json"})
            if not headers:
                return result("unavailable", 503)
            response = requests.post(
                rpc_url, headers=headers, json={"p_user_id": user_id}, timeout=6,
            )
            if response.ok:
                status = response.json()
                if status in ("awarded", "already_awarded", "completed"):
                    return result(status)
            app.logger.warning("Archive completion RPC returned HTTP %s", response.status_code)
        except (requests.RequestException, ValueError):
            app.logger.warning("Archive completion temporarily unavailable")
        return result("unavailable", 503)
