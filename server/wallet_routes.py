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

# Each status has its own public contract. In particular, a question must
# never carry correctness, reward or answer-key fields from a future RPC change.
QUIZ_FIELDS = {
    "question": ("attempt_id", "topic_id", "question_id", "step", "total", "prompt", "choices"),
    "complete": ("attempt_id", "correct_count", "total"),
    "active_attempt": ("attempt_id", "topic_id"),
    "answered": ("correct", "coins_awarded", "perfect_bonus", "balance", "next"),
    "duplicate": ("correct", "coins_awarded", "balance", "next"),
    **{status: () for status in ("expired", "unavailable", "invalid", "attempt_limit", "stale")},
}
BUY_FIELDS = {
    "applied": ("balance", "transaction_id", "item_id"),
    "owned": ("balance",),
    "insufficient": ("balance",),
    "unavailable": ("balance",),
}


def uuid_string(value):
    if not isinstance(value, str) or len(value) > 36:
        raise ValueError("Invalid ID")
    return str(UUID(value))


def _public_fields(value, contracts):
    if not isinstance(value, dict):
        raise ValueError("Unexpected RPC result")
    status = value.get("status")
    if not isinstance(status, str) or status not in contracts:
        raise ValueError("Unexpected RPC status")
    fields = contracts[status]
    if not all(field in value for field in fields):
        raise ValueError("Incomplete RPC result")
    return {"status": status, **{field: value[field] for field in fields}}


def _integer(value, low=0, high=None):
    if type(value) is not int or value < low or (high is not None and value > high):
        raise ValueError("Unexpected integer")
    return value


def quiz_public(value, nested=False):
    out = _public_fields(value, QUIZ_FIELDS)
    status = out["status"]
    if nested and status not in ("question", "complete", "expired", "unavailable"):
        raise ValueError("Unexpected next quiz status")
    for field in ("attempt_id", "question_id"):
        if field in out:
            out[field] = uuid_string(out[field])
    if "topic_id" in out and (not isinstance(out["topic_id"], str) or
                              not re.fullmatch(r"[a-z0-9_-]{1,100}", out["topic_id"])):
        raise ValueError("Unexpected topic")
    if "total" in out:
        _integer(out["total"], 20, 20)
    if "step" in out:
        _integer(out["step"], 1, out["total"])
    if "correct_count" in out:
        _integer(out["correct_count"], 0, out["total"])
    if status == "question":
        if not isinstance(out["prompt"], str) or not out["prompt"].strip():
            raise ValueError("Unexpected prompt")
        choices = out["choices"]
        if (not isinstance(choices, list) or len(choices) != 4 or
                not all(isinstance(c, str) and c.strip() for c in choices) or
                len(set(choices)) != 4):
            raise ValueError("Unexpected choices")
    if status in ("answered", "duplicate"):
        if type(out["correct"]) is not bool:
            raise ValueError("Unexpected correctness")
        _integer(out["coins_awarded"])
        _integer(out["balance"])
        if "perfect_bonus" in out:
            _integer(out["perfect_bonus"])
        if status == "duplicate" and out["coins_awarded"] != 0:
            raise ValueError("Replay cannot award additional coins")
        if not out["correct"] and (out["coins_awarded"] or out.get("perfect_bonus", 0)):
            raise ValueError("Incorrect answer cannot award coins")
        out["next"] = quiz_public(out["next"], nested=True)
    return out


def buy_public(value):
    out = _public_fields(value, BUY_FIELDS)
    _integer(out["balance"])
    if out["status"] == "applied":
        out["transaction_id"] = uuid_string(out["transaction_id"])
        if not isinstance(out["item_id"], str) or not re.fullmatch(r"[a-zA-Z0-9_.:-]{1,160}", out["item_id"]):
            raise ValueError("Unexpected purchase item")
    return out


def register_wallet_routes(app, *, supabase_url, extract_bearer_token,
                           verify_access_token, headers_for_service):
    def response(payload, code=200):
        reply = jsonify(payload)
        reply.headers["Cache-Control"] = "no-store, private"
        return reply, code

    def run(flag, allowed_keys, required_keys, operation, params, sanitize):
        # Even an accidentally enabled production flag cannot activate these routes.
        if ((supabase_url or "").rstrip("/") != STAGING_URL or
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
