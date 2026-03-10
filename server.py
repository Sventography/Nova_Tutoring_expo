#!/usr/bin/env python3
import os
import json
import time
import hashlib
import random
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

# --------------------------- Env loading (backend-only) ---------------------------


def load_server_env():
    """
    Load secrets from server/env/.env.server if present.
    Keeps Expo from auto-reading server secrets in the root.
    """
    try:
        from dotenv import load_dotenv

        env_file = os.getenv("SERVER_ENV_FILE", "server/env/.env.server")
        if os.path.exists(env_file):
            load_dotenv(env_file, override=False)
    except Exception:
        # dotenv optional — if missing, skip
        pass


load_server_env()

# --------------------------- Config ---------------------------
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"

# Supabase config (server-side only)
SUPABASE_URL = (os.getenv("SUPABASE_URL", "") or "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
if not SUPABASE_SERVICE_ROLE_KEY:
    # Fallback to anon if service role not set (okay for /auth/v1/user)
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_ANON_KEY", "").strip()

# Flask bind
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "5055"))

# Optional “external” base for logs/health (not required by app)
APP_FRONTEND_URL = os.getenv("APP_FRONTEND_URL", "").strip()

# CORS
CORS_ALLOW_ORIGIN = os.getenv("CORS_ALLOW_ORIGIN", "*").strip() or "*"

# --------------------------- OpenAI client (optional) ---------------------------
_client = None


def get_openai_client():
    global _client
    if _client is not None:
        return _client
    if not OPENAI_API_KEY:
        return None
    try:
        # OpenAI >= 1.0 SDK
        from openai import OpenAI

        _client = OpenAI(api_key=OPENAI_API_KEY)
        return _client
    except Exception:
        return None


# --------------------------- App ---------------------------
app = Flask(__name__)
CORS(
    app,
    resources={r"/*": {"origins": CORS_ALLOW_ORIGIN}},
    supports_credentials=True,
)

# --------------------------- Utils ---------------------------


def jerr(msg: str, code: int = 400):
    return jsonify({"error": msg}), code


def norm(s: str) -> str:
    return (s or "").strip().lower()


# Ask memory tiers: free + 4 paid levels.
# Tiers can be stored in Supabase as strings like: free, tier1, tier2, tier3, tier4.
ASK_MEMORY_DEFAULT_LIMITS: Dict[str, int] = {
    "free": 4,      # tiny history
    "tier1": 10,    # small
    "tier_1": 10,
    "tier2": 25,    # medium
    "tier_2": 25,
    "tier3": 50,    # large
    "tier_3": 50,
    "tier4": 100,   # max
    "tier_4": 100,
}


def resolve_ask_memory_limit(profile: Optional[Dict[str, Any]]) -> int:
    """
    Decide how many past messages we allow into /api/ask based on the user's
    ask_memory_tier and/or ask_memory_limit from Supabase.

    - If ask_memory_limit is a positive integer, that wins.
    - Otherwise, we map ask_memory_tier (free, tier1..tier4) to a default.
    - If no profile or unknown tier, we fall back to 'free'.
    """
    if profile:
        explicit = profile.get("ask_memory_limit")
        try:
            if explicit is not None:
                limit_int = int(explicit)
                if limit_int > 0:
                    return limit_int
        except Exception:
            pass

        tier_raw = profile.get("ask_memory_tier")
        key = norm(tier_raw) if tier_raw else "free"
    else:
        key = "free"

    return ASK_MEMORY_DEFAULT_LIMITS.get(key, ASK_MEMORY_DEFAULT_LIMITS["free"])


# Very small offline judge for sample teasers
def offline_teaser_check(teaser: str, answer: str) -> Dict[str, Any]:
    t = norm(teaser)
    a = norm(answer)

    if "keys" in t and "open locks" in t:
        ok = ("keyboard" in a) or ("piano" in a)
        return {
            "correct": ok,
            "feedback": "keyboard or piano" if ok else "Think of keys that type or play.",
            "coins_awarded": 5 if ok else 0,
        }

    if ("speak without a mouth" in t) or ("hear without ears" in t):
        ok = "echo" in a
        return {
            "correct": ok,
            "feedback": "echo" if ok else "It repeats you in canyons.",
            "coins_awarded": 5 if ok else 0,
        }

    if "the less you see" in t:
        ok = ("dark" in a) or ("darkness" in a) or ("fog" in a)
        return {
            "correct": ok,
            "feedback": "darkness" if ok else "When it increases, visibility drops.",
            "coins_awarded": 5 if ok else 0,
        }

    return {
        "correct": False,
        "feedback": "No match offline. Try again!",
        "coins_awarded": 0,
    }


def today_seed() -> int:
    # Deterministic per day seed
    d = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return int(hashlib.sha256(d.encode()).hexdigest(), 16) % (2**31 - 1)


# Small built-in pool if no OpenAI
SEED_TEASERS = [
    "What has keys but can’t open locks?",
    "I speak without a mouth and hear without ears. What am I?",
    "The more of this there is, the less you see. What is it?",
    "What gets wetter the more it dries?",
    "What can you catch but not throw?",
    "What has hands but can’t clap?",
    "What has a neck but no head?",
    "What has to be broken before you can use it?",
    "What is full of holes but still holds water?",
    "What goes up but never comes down?",
]


def pick_five_teasers() -> List[str]:
    rnd = random.Random(today_seed())
    if get_openai_client():
        # Try generating fresh ones with OpenAI (best-effort)
        try:
            client = get_openai_client()
            prompt = (
                "Generate 5 concise, kid-friendly brain teasers as a numbered list. "
                "Each on one line, no answers, no explanations."
            )
            # Prefer responses API (new SDK). Fallback to chat if needed.
            try:
                resp = client.responses.create(
                    model=OPENAI_MODEL,
                    input=prompt,
                )
                text = (getattr(resp, "output_text", None) or "").strip()
            except Exception:
                chat = client.chat.completions.create(
                    model=OPENAI_MODEL,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.7,
                )
                text = (chat.choices[0].message.content or "").strip()

            lines = [l.strip("- ").strip() for l in text.splitlines() if l.strip()]
            # Extract 5 lines that look like teasers (strip numbers if any)
            teasers = []
            for l in lines:
                # naive "1. Riddle" stripping
                if len(l) >= 2 and l[0].isdigit() and l[1] in {".", ")", ":"}:
                    l = l.split(" ", 1)[-1].strip()
                if len(l) > 8:
                    teasers.append(l)
                if len(teasers) == 5:
                    break
            if len(teasers) == 5:
                return teasers
        except Exception:
            pass

    # Fallback deterministic 5 from the seed pool
    rnd.shuffle(SEED_TEASERS)
    return SEED_TEASERS[:5]


# --------------------------- Supabase auth helpers ---------------------------


def get_supabase_user_from_request():
    """
    Reads Authorization: Bearer <token> from the request, asks Supabase
    /auth/v1/user who this is, and returns (user_dict, None, 200) on success
    or (None, error_message, status_code) on failure.
    """
    auth = request.headers.get("Authorization", "")
    if not auth.lower().startswith("bearer "):
        return None, "Missing or invalid Authorization header", 401

    token = auth.split(" ", 1)[1].strip()
    if not token:
        return None, "Empty bearer token", 401

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return None, "Supabase not configured on server", 500

    try:
        resp = requests.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {token}",
            },
            timeout=5,
        )
    except Exception as e:
        return None, f"Error contacting Supabase: {e}", 502

    if resp.status_code != 200:
        return None, f"Supabase auth failed ({resp.status_code})", 401

    try:
        user = resp.json()
    except Exception:
        return None, "Failed to parse Supabase user JSON", 500

    return user, None, 200


def get_supabase_profile(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch the minimal profile data we need for Ask memory:
    id, ask_memory_tier, ask_memory_limit

    Uses the service role (or anon if that's all we have) to talk to
    Supabase /rest/v1/profiles.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY or not user_id:
        return None

    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/profiles",
            headers={
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                "Accept": "application/json",
            },
            params={
                "id": f"eq.{user_id}",
                "select": "id,ask_memory_tier,ask_memory_limit",
                "limit": 1,
            },
            timeout=5,
        )
    except Exception:
        return None

    if resp.status_code != 200:
        return None

    try:
        rows = resp.json()
    except Exception:
        return None

    if isinstance(rows, list) and rows:
        return rows[0]
    return None


def get_profile_for_request() -> Optional[Dict[str, Any]]:
    """
    Best-effort: if there's a valid Supabase bearer token, get the user and
    then their profile. If anything fails, we just return None and treat
    them as 'free' tier on /api/ask.
    """
    try:
        user, err, status = get_supabase_user_from_request()
    except Exception:
        return None

    if err or not user:
        return None

    user_id = user.get("id")
    if not user_id:
        return None

    return get_supabase_profile(user_id)


def get_ask_history_for_user(user_id: str, limit: int) -> List[Dict[str, Any]]:
    """
    Load up to `limit` recent ask_messages for this user, oldest first,
    to feed into the Ask conversation context.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return []
    user_id = (user_id or "").strip()
    if not user_id or limit <= 0:
        return []

    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/ask_messages",
            headers={
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                "Accept": "application/json",
            },
            params={
                "user_id": f"eq.{user_id}",
                "order": "created_at.asc",
                "limit": limit,
            },
            timeout=5,
        )
    except Exception as e:
        print(f"[ask_messages] history error: {e}")
        return []

    if resp.status_code != 200:
        print(
            f"[ask_messages] history status {resp.status_code}: {resp.text}"
        )
        return []

    try:
        rows = resp.json()
    except Exception as e:
        print(f"[ask_messages] history parse error: {e}")
        return []

    if isinstance(rows, list):
        return rows
    return []


def append_ask_exchange(user_id: str, question: str, answer: str) -> None:
    """
    Append the latest user question + assistant answer to ask_messages
    for this user. Best-effort; errors are logged but do not break /api/ask.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return
    user_id = (user_id or "").strip()
    if not user_id:
        return

    q_text = (question or "").strip()
    a_text = (answer or "").strip()
    rows = []
    if q_text:
        rows.append(
            {
                "user_id": user_id,
                "role": "user",
                "content": q_text,
                "pinned": False,
            }
        )
    if a_text:
        rows.append(
            {
                "user_id": user_id,
                "role": "assistant",
                "content": a_text,
                "pinned": False,
            }
        )
    if not rows:
        return

    try:
        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/ask_messages",
            headers={
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            json=rows,
            timeout=5,
        )
        if resp.status_code not in (200, 201, 204):
            print(
                f"[ask_messages] insert status {resp.status_code}: {resp.text}"
            )
    except Exception as e:
        print(f"[ask_messages] insert error: {e}")


# --------------------------- Routes ---------------------------


@app.get("/health")
def health():
    return jsonify(
        {
            "ok": True,
            "time": int(time.time()),
            "frontend": APP_FRONTEND_URL or None,
            "has_openai": bool(get_openai_client()),
            "port": PORT,
        }
    )


@app.get("/api/ping")
def ping():
    return jsonify({"pong": True, "time": int(time.time())})


@app.get("/api/auth/me")
def api_auth_me():
    """
    Phase 2 test route:
    Frontend sends Authorization: Bearer <supabase_access_token>
    Server responds with Supabase's user object if valid.
    """
    user, err, status = get_supabase_user_from_request()
    if err:
        return jerr(err, status)
    return jsonify({"user": user})


@app.post("/api/ask")
def api_ask():
    data = request.get_json(silent=True) or {}
    q = (data.get("question") or "").strip()
    if not q:
        return jerr("Missing 'question'", 400)

    # ---------------- Identify user + profile ----------------
    raw_user_id = (data.get("user_id") or "").strip()
    user_id: Optional[str] = raw_user_id or None

    profile: Optional[Dict[str, Any]] = None

    # If we have a user_id from the body, try to get profile by ID first.
    if user_id:
        profile = get_supabase_profile(user_id)

    # Fallback: try to infer from Authorization bearer token.
    if profile is None:
        maybe_profile = get_profile_for_request()
        if maybe_profile:
            profile = maybe_profile
            if not user_id:
                user_id = maybe_profile.get("id")

    max_history = resolve_ask_memory_limit(profile)
    tier_value = (profile or {}).get("ask_memory_tier") or "free"

    # ---------------- Memory tier + history handling ----------------
    history_messages: List[Dict[str, str]] = []

    # Preferred: use stored ask_messages for logged-in users.
    db_history: List[Dict[str, Any]] = []
    if user_id and max_history > 0:
        db_history = get_ask_history_for_user(user_id, max_history)

    if db_history:
        for row in db_history:
            role = norm(row.get("role", "user"))
            if role not in ("user", "assistant"):
                role = "user"
            content = str(row.get("content") or "").strip()
            if not content:
                continue
            history_messages.append({"role": role, "content": content})
    else:
        # Fallback: optional conversation history from frontend, shape:
        #   history: [{ role: "user" | "assistant" | "system", content: string }, ...]
        history_raw = data.get("history") or []
        if isinstance(history_raw, list):
            for item in history_raw:
                if not isinstance(item, dict):
                    continue
                role = str(item.get("role") or "user").lower()
                if role not in ("user", "assistant", "system"):
                    role = "user"
                content = str(item.get("content") or "").strip()
                if not content:
                    continue
                history_messages.append({"role": role, "content": content})

        # Trim to the allowed Ask memory limit (free + 4 paid tiers)
        if max_history > 0 and len(history_messages) > max_history:
            history_messages = history_messages[-max_history:]

    # Build a simple conversation-style prompt
    conversation_lines: List[str] = []
    for m in history_messages:
        role = m["role"]
        if role == "user":
            prefix = "User"
        elif role == "assistant":
            prefix = "Assistant"
        else:
            prefix = "System"
        conversation_lines.append(f"{prefix}: {m['content']}")

    # Always end with the new question as the latest user turn
    conversation_lines.append(f"User: {q}")
    conversation_text = "\n".join(conversation_lines)

    if history_messages:
        prompt = (
            "You are a helpful, encouraging tutor. Continue the conversation below and answer the "
            "latest user question concisely and clearly, using the prior messages as context.\n\n"
            f"{conversation_text}\n\nAssistant:"
        )
    else:
        prompt = f"Answer concisely and helpfully as a tutor:\n\n{q}"

    client = get_openai_client()
    if client:
        try:
            try:
                resp = client.responses.create(
                    model=OPENAI_MODEL,
                    input=prompt,
                )
                answer = (getattr(resp, "output_text", None) or "").strip()
            except Exception:
                chat = client.chat.completions.create(
                    model=OPENAI_MODEL,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.5,
                )
                answer = (chat.choices[0].message.content or "").strip()

            # Persist the new Q&A to ask_messages if we know the user.
            if user_id:
                append_ask_exchange(user_id, q, answer)

            return jsonify(
                {
                    "answer": answer,
                    "coins_awarded": 1,
                    "ask_memory_tier": tier_value,
                    "ask_memory_limit": max_history,
                }
            )
        except Exception as e:
            return jerr(f"OpenAI error: {e}", 500)

    # No key → offline fallback
    fake = (
        "I can’t reach the AI model right now, but here’s a tip: break the problem into smaller steps."
    )

    if user_id:
        append_ask_exchange(user_id, q, fake)

    return jsonify(
        {
            "answer": fake,
            "coins_awarded": 0,
            "ask_memory_tier": tier_value,
            "ask_memory_limit": max_history,
        }
    )


@app.get("/api/teasers/today")
def api_teasers_today():
    return jsonify(
        {
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "teasers": pick_five_teasers(),
        }
    )


@app.post("/api/teasers/check")
def api_teasers_check():
    data = request.get_json(silent=True) or {}
    teaser = (data.get("teaser") or data.get("prompt") or "").strip()
    answer = (data.get("answer") or "").strip()
    if not teaser or not answer:
        return jerr("Missing 'teaser' and/or 'answer'", 400)

    # First try a local quick judge for common classics
    local = offline_teaser_check(teaser, answer)
    if local.get("correct") is True:
        return jsonify(local)

    # If we have OpenAI, verify with a single-shot classification
    client = get_openai_client()
    if client:
        try:
            judge_prompt = (
                "You are a strict grader. Decide if the user's answer correctly solves the riddle.\n"
                "Reply strictly as JSON with fields: correct (true/false), feedback (short string).\n\n"
                f"Riddle: {teaser}\n"
                f"Answer: {answer}\n"
            )
            try:
                resp = client.responses.create(
                    model=OPENAI_MODEL, input=judge_prompt
                )
                txt = (getattr(resp, "output_text", None) or "").strip()
            except Exception:
                chat = client.chat.completions.create(
                    model=OPENAI_MODEL,
                    messages=[{"role": "user", "content": judge_prompt}],
                    temperature=0.0,
                )
                txt = (chat.choices[0].message.content or "").strip()

            parsed = None
            try:
                parsed = json.loads(txt)
            except Exception:
                # Try to pull JSON blob if wrapped
                start = txt.find("{")
                end = txt.rfind("}")
                if start >= 0 and end > start:
                    parsed = json.loads(txt[start : end + 1])

            if isinstance(parsed, dict) and "correct" in parsed:
                correct = bool(parsed.get("correct"))
                feedback = str(
                    parsed.get("feedback")
                    or ("Correct!" if correct else "Incorrect.")
                )
                return jsonify(
                    {
                        "correct": correct,
                        "feedback": feedback,
                        "coins_awarded": 5 if correct else 0,
                    }
                )
        except Exception:
            pass

    # Default: incorrect (unknown)
    return jsonify(
        {"correct": False, "feedback": "Try again!", "coins_awarded": 0}
    )


# --------------------------- Simple shop stubs ---------------------------

CATALOG = [
    {
        "id": "plushie_bunny",
        "name": "Nova Plushie (Bunny)",
        "desc": "Soft 8” plush. Limited run.",
        "tangible": True,
        "priceCashUSD": 24.0,
        "priceCoins": 1500,
        "tag": "plushie",
        "image": "/assets/shop/plushie_bunny_front.png",
    },
    {
        "id": "theme_cyber_cyan",
        "name": "Cyber Cyan Theme",
        "desc": "Glowing cyan UI theme.",
        "tangible": False,
        "virtualPriceCoins": 250,
        "tag": "premium",
        "image": "/assets/shop/theme_cyan.png",
    },
]


@app.get("/api/shop/list")
def api_shop_list():
    return jsonify({"catalog": CATALOG})


@app.post("/api/order")
def api_order():
    data = request.get_json(silent=True) or {}
    item_id = (data.get("item_id") or "").strip()
    payment_mode = (data.get("payment_mode") or "coins").strip()
    # In real app: validate, store, email, create Stripe session, etc.
    if not item_id:
        return jerr("Missing item_id", 400)
    if payment_mode not in ("coins", "cash"):
        return jerr("payment_mode must be 'coins' or 'cash'", 400)
    result = {"ok": True}
    if payment_mode == "cash":
        result["payment_url"] = None  # Fill in with Stripe session URL if integrated
    return jsonify(result)


# --------------------------- Achievements passthrough ---------------------------


@app.get("/api/achievements")
def get_achievements():
    """
    Simple passthrough that serves app/_data/achievements.json so the app
    can fetch live definitions from the backend instead of bundling them.
    """
    try:
        path = os.path.join("app", "_data", "achievements.json")
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jerr(str(e), 500)


# --------------------------- Main ---------------------------
if __name__ == "__main__":
    print(f"🚀 Flask listening on http://{HOST}:{PORT}")
    app.run(host=HOST, port=PORT, debug=True)