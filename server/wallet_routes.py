"""Staging-only authenticated adapter for the verified wallet SQL operations.

No generic grant endpoint. Auth identifies the account; the database determines
prices, answers, rewards, caps, idempotency and balances.
"""
import json
import os
import re
from uuid import UUID

import requests
from flask import jsonify, request

# Deliberate defense in depth until a reviewed production cutover.
STAGING_URL = "https://gouhhltupxaycuysdtrw.supabase.co"
MAX_BODY = 2048

QUIZ_STATUSES = frozenset(("question", "complete", "expired", "unavailable",
                          "invalid", "active_attempt", "attempt_limit",
                          "answered", "duplicate", "stale"))
BUY_STATUSES = frozenset(("applied", "owned", "insufficient", "unavailable"))
QUIZ_FIELDS = ("status", "attempt_id", "topic_id", "question_id", "step",
               "total", "prompt", "choices", "correct_count", "correct",
               "coins_awarded", "perfect_bonus", "balance")
BUY_FIELDS = ("status", "balance", "transaction_id", "item_id")


def uuid_string(value):
    if not isinstance(value, str) or len(value) > 36:
        raise ValueError("Invalid ID")
    return str(UUID(value))


def quiz_public(value, nested=False):
    if not isinstance(value, dict) or value.get("status") not in QUIZ_STATUSES:
        raise ValueError("Unexpected quiz result")
    out = {k: value[k] for k in QUIZ_FIELDS if k in value}
    if "choices" in out:
        choices = out["choices"]
        if not isinstance(choices, list) or len(choices) != 4 or not all(isinstance(c, str) for c in choices):
            raise ValueError("Unexpected choices")
    # Refuse arbitrary structured objects in scalar fields.
    if any(isinstance(v, (list, dict)) for k, v in out.items() if k != "choices"):
        raise ValueError("Unexpected quiz field")
    if "next" in value and not nested:
        out["next"] = quiz_public(value["next"], nested=True)
    return out


def buy_public(value):
    if not isinstance(value, dict) or value.get("status") not in BUY_STATUSES:
        raise ValueError("Unexpected purchase result")
    out = {k: value[k] for k in BUY_FIELDS if k in value}
    if any(isinstance(v, (list, dict)) for v in out.values()):
        raise ValueError("Unexpected purchase field")
    return out


def register_wallet_routes(app, *, supabase_url, extract_bearer_token,
                           verify_access_token, headers_for_service):
    def response(payload, code=200):
        reply = jsonify(payload)
        reply.headers["Cache-Control"] = "no-store, private"
        return reply, code

    def run(flag, allowed_keys, required_keys, operation, params, sanitize):
        # Even an accidentally enabled production flag cannot activate these routes.
        if (supabase_url.rstrip("/") != STAGING_URL or
                os.getenv(flag, "").strip().lower() != "true"):
            return response({"status": "closed"}, 503)
        if not request.is_json:
            return response({"status": "invalid"}, 400)
        if request.content_length is not None and request.content_length > MAX_BODY:
            return response({"status": "invalid"}, 413)
        try:
            raw = request.stream.read(MAX_BODY + 1)
            if len(raw) > MAX_BODY:
                return response({"status": "invalid"}, 413)
            body = json.loads(raw)
            if not isinstance(body, dict) or not required_keys <= body.keys() or not body.keys() <= allowed_keys:
                return response({"status": "invalid"}, 400)
            arguments = params(body)
        except (ValueError, TypeError, KeyError):
            return response({"status": "invalid"}, 400)
        try:
            token = extract_bearer_token()
            user = verify_access_token(token) if token else None
            if not isinstance(user, dict) or user.get("is_anonymous") is True:
                return response({"status": "unauthorized"}, 401)
            try:
                account = uuid_string(user.get("id"))
            except (ValueError, TypeError):
                return response({"status": "unauthorized"}, 401)
            headers = headers_for_service({"Content-Type": "application/json"})
            if not headers:
                return response({"status": "unavailable"}, 503)
            result = requests.post(
                STAGING_URL + "/rest/v1/rpc/" + operation,
                headers=headers, json={"p_user_id": account, **arguments},
                timeout=(3, 8), allow_redirects=False,
            )
            if result.status_code != 200:
                return response({"status": "unavailable"}, 503)
            return response(sanitize(result.json()))
        except (requests.RequestException, RuntimeError, ValueError, TypeError, KeyError):
            app.logger.warning("Verified wallet operation unavailable")
            return response({"status": "unavailable"}, 503)

    def start_params(body):
        topic = body["topic_id"]
        if not isinstance(topic, str) or not re.fullmatch(r"[a-z0-9_-]{1,100}", topic):
            raise ValueError("Invalid topic")
        return {"p_topic_id": topic, "p_request_id": uuid_string(body["request_id"])}

    def current_params(body):
        return {"p_attempt_id": uuid_string(body["attempt_id"])}

    def answer_params(body):
        choice = body["choice"]
        if type(choice) is not int or not 1 <= choice <= 4:
            raise ValueError("Invalid choice")
        return {**current_params(body), "p_question_id": uuid_string(body["question_id"]), "p_choice": choice}

    def buy_params(body):
        item = body["item_id"]
        if not isinstance(item, str) or not re.fullmatch(r"[a-zA-Z0-9_.:-]{1,160}", item):
            raise ValueError("Invalid item")
        return {"p_item_id": item}

    @app.post("/api/wallet/quiz/start")
    def verified_quiz_start():
        keys = {"topic_id", "request_id"}
        return run("NOVA_VERIFIED_QUIZ_ENABLED", keys, keys, "nova_begin_verified_quiz", start_params, quiz_public)

    @app.post("/api/wallet/quiz/current")
    def verified_quiz_current():
        keys = {"attempt_id"}
        return run("NOVA_VERIFIED_QUIZ_ENABLED", keys, keys, "nova_quiz_current", current_params, quiz_public)

    @app.post("/api/wallet/quiz/answer")
    def verified_quiz_answer():
        keys = {"attempt_id", "question_id", "choice"}
        return run("NOVA_VERIFIED_QUIZ_ENABLED", keys, keys, "nova_claim_quiz_reward", answer_params, quiz_public)

    @app.post("/api/wallet/purchase")
    def verified_wallet_purchase():
        keys = {"item_id"}
        return run("NOVA_VERIFIED_COIN_SHOP_ENABLED", keys, keys, "nova_wallet_buy", buy_params, buy_public)
