#!/usr/bin/env python3
import os
import json
import time
import hashlib
import random
from datetime import datetime, timezone
from typing import List, Dict, Any

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
OPENAI_MODEL   = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"

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
CORS(app, resources={r"/*": {"origins": CORS_ALLOW_ORIGIN}}, supports_credentials=True)

# --------------------------- Utils ---------------------------
def jerr(msg: str, code: int = 400):
    return jsonify({"error": msg}), code

def norm(s: str) -> str:
    return (s or "").strip().lower()

# Very small offline judge for sample teasers
def offline_teaser_check(teaser: str, answer: str) -> Dict[str, Any]:
    t = norm(teaser)
    a = norm(answer)

    if ("keys" in t and "open locks" in t):
        ok = ("keyboard" in a) or ("piano" in a)
        return {"correct": ok, "feedback": "keyboard or piano" if ok else "Think of keys that type or play.", "coins_awarded": 5 if ok else 0}

    if ("speak without a mouth" in t) or ("hear without ears" in t):
        ok = "echo" in a
        return {"correct": ok, "feedback": "echo" if ok else "It repeats you in canyons.", "coins_awarded": 5 if ok else 0}

    if ("the less you see" in t):
        ok = ("dark" in a) or ("darkness" in a) or ("fog" in a)
        return {"correct": ok, "feedback": "darkness" if ok else "When it increases, visibility drops.", "coins_awarded": 5 if ok else 0}

    return {"correct": False, "feedback": "No match offline. Try again!", "coins_awarded": 0}

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
    "What goes up but never comes down?"
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
                text = (resp.output_text or "").strip()
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
                l = l.split(".", 1)[-1].strip() if l[:2].isdigit() else l
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

# --------------------------- Routes ---------------------------
@app.get("/health")
def health():
    return jsonify({
        "ok": True,
        "time": int(time.time()),
        "frontend": APP_FRONTEND_URL or None,
        "has_openai": bool(get_openai_client()),
        "port": PORT
    })

@app.get("/api/ping")
def ping():
    return jsonify({"pong": True, "time": int(time.time())})

@app.post("/api/ask")
def api_ask():
    data = request.get_json(silent=True) or {}
    q = (data.get("question") or "").strip()
    if not q:
        return jerr("Missing 'question'", 400)

    client = get_openai_client()
    if client:
        try:
            try:
                resp = client.responses.create(
                    model=OPENAI_MODEL,
                    input=f"Answer concisely and helpfully:\n\n{q}",
                )
                answer = (resp.output_text or "").strip()
            except Exception:
                chat = client.chat.completions.create(
                    model=OPENAI_MODEL,
                    messages=[{"role": "user", "content": q}],
                    temperature=0.5,
                )
                answer = (chat.choices[0].message.content or "").strip()
            # Optional small reward
            return jsonify({"answer": answer, "coins_awarded": 1})
        except Exception as e:
            return jerr(f"OpenAI error: {e}", 500)

    # No key → offline fallback
    fake = "I can’t reach the AI model right now, but here’s a tip: break the problem into smaller steps."
    return jsonify({"answer": fake, "coins_awarded": 0})

@app.get("/api/teasers/today")
def api_teasers_today():
    return jsonify({"date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "teasers": pick_five_teasers()})

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
                resp = client.responses.create(model=OPENAI_MODEL, input=judge_prompt)
                txt = (resp.output_text or "").strip()
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
                    parsed = json.loads(txt[start:end+1])

            if isinstance(parsed, dict) and "correct" in parsed:
                correct = bool(parsed.get("correct"))
                feedback = str(parsed.get("feedback") or ("Correct!" if correct else "Incorrect."))
                return jsonify({"correct": correct, "feedback": feedback, "coins_awarded": 5 if correct else 0})
        except Exception:
            pass

    # Default: incorrect (unknown)
    return jsonify({"correct": False, "feedback": "Try again!", "coins_awarded": 0})

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

# --------------------------- Main ---------------------------
if __name__ == "__main__":
    print(f"🚀 Flask listening on http://{HOST}:{PORT}")
    app.run(host=HOST, port=PORT, debug=True)
from flask import Flask, jsonify
import json
import os

app = Flask(__name__)

@app.route("/api/achievements", methods=["GET"])
def get_achievements():
    try:
        with open(os.path.join("app", "_data", "achievements.json"), "r") as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
