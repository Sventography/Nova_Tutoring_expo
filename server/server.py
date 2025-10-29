import os, certifi
os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["REQUESTS_CA_BUNDLE"] = os.environ["SSL_CERT_FILE"]
import os, certifi
import stripe
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")

os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["REQUESTS_CA_BUNDLE"] = os.environ["SSL_CERT_FILE"]
import os, certifi
os.environ.setdefault("SSL_CERT_FILE", certifi.where())
import os, certifi
os.environ.setdefault("SSL_CERT_FILE", certifi.where())
import os
import io
import tempfile
from typing import Any, Dict, List, Optional

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from dotenv import load_dotenv

# --- Load environment early (override shell so .env wins) ---
load_dotenv(override=True)

# --- OpenAI client (new SDK first, legacy fallback) ---
NEW_SDK = False
client = None
openai_legacy = None
try:
    from openai import OpenAI  # type: ignore
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))
    NEW_SDK = True
except Exception:
    try:
        import openai as openai_legacy  # type: ignore
        openai_legacy.api_key = os.getenv("OPENAI_API_KEY", "")
    except Exception:
        openai_legacy = None

# --- Local deps (your project modules) ---
from verify import bp as verify_bp  # local

# --- Flask app ---
app = Flask(__name__)
CORS(app)

# Config / feature-flags
STAGING = os.getenv("STAGING", "0") == "1"
STAGING_USER = os.getenv("STAGING_USER", "")
STAGING_PASS = os.getenv("STAGING_PASS", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()

# ---------- Utilities ----------

def _staging_auth_required():
    """Simple basic-auth gate for staging. Allows /api/health unauthenticated."""
    # allow healthcheck open
    if request.path.startswith("/api/health"):
        return None
    if not STAGING:
        return None
    # basic auth
    auth = request.authorization
    if not auth or auth.username != STAGING_USER or auth.password != STAGING_PASS:
        return Response(
            "Authentication required", 401,
            {"WWW-Authenticate": 'Basic realm="Nova Staging"'}
        )
    return None

@app.before_request
def _staging_gate():
    maybe = _staging_auth_required()
    if maybe is not None:
        return maybe

@app.after_request
def _noindex(resp):
    # Avoid accidental SEO indexing in non-prod
    try:
        resp.headers["X-Robots-Tag"] = "noindex, nofollow"
    except Exception:
        pass
    return resp

# Register your blueprint(s)
app.register_blueprint(verify_bp)

# ---------- Health ----------

@app.get("/api/health")
def api_health():
    return jsonify(ok=True), 200

# ---------- Certifications / Achievements ----------

@app.post("/api/certifications")
def api_certifications():
    app.logger.debug("api_certifications called")
    data = request.get_json(silent=True) or {}
    user = (data.get("user") or "").strip()
    topic = (data.get("topic") or "").strip()
    try:
        score = int(float(data.get("score") or 0))
    except Exception:
        score = 0

    if not user or not topic:
        return jsonify(error="user and topic are required"), 400

    # record cert
    app.logger.debug("recording cert for %s - %s (%s%%)", user, topic, score)
    rec = db_helper.record_certificate(user, topic, score)
    app.logger.debug("certificate recorded %s", rec)

    # evaluate achievements unlocked
    total = db_helper.count_certs(user)
    app.logger.debug("total certs for %s = %s", user, total)
    unlocked = []
    for a in db_helper.list_achievements():
        if total >= a["threshold"] and not db_helper.user_has_achievement(user, a["code"]):
            db_helper.award_achievement(user, a["code"])
            app.logger.debug("achievement unlocked %s for %s", a["code"], user)
            db_helper.coins_grant(user, a["reward_coins"])
            app.logger.debug("coins granted %s to %s", a["reward_coins"], user)
            unlocked.append({"code": a["code"], "name": a["name"], "coins": a["reward_coins"]})

    return jsonify(ok=True, issued_at=rec["issued_at"], total_certificates=total, unlocked=unlocked), 200

@app.get("/api/achievements")
def api_achievements():
    app.logger.debug("api_achievements called")
    user = (request.args.get("user") or "").strip()
    if not user:
        return jsonify(error="user is required"), 400

    all_achs = db_helper.list_achievements()
    app.logger.debug("loaded %d achievement definitions", len(all_achs))

    with db_helper.get_conn() as con:
        rows = con.execute(
            "SELECT achievement_code, awarded_at FROM user_achievements WHERE user_email=?",
            (user,)
        ).fetchall()
        owned = {code: ts for (code, ts) in rows}
        app.logger.debug("user owns %d achievements", len(rows))

    enriched = []
    for a in all_achs:
        a2 = dict(a)
        a2["awarded_at"] = owned.get(a["code"])
        enriched.append(a2)

    return jsonify(achievements=enriched), 200

@app.get("/api/certificates")
def api_certificates():
    app.logger.debug("api_certificates called")
    user = (request.args.get("user") or "").strip()
    if not user:
        return jsonify(error="user is required"), 400
    certs = db_helper.list_certs(user)
    app.logger.debug("returning %d certs", len(certs))
    return jsonify(certificates=certs), 200

# ---------- OpenAI helpers ----------

def _chat(messages: List[Dict[str, Any]], model: str = "gpt-4o-mini") -> str:
    """
    Unified chat call that supports the new OpenAI SDK and legacy 'openai' package.
    'messages' should be a list like [{'role':'system'|'user'|'assistant', 'content':'...'}, ...]
    """
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not set")

    if NEW_SDK and client:
        # New SDK (recommended)
        resp = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0,
        )
        return resp.choices[0].message.content or ""
    elif openai_legacy:
        # Legacy package fallback
        resp = openai_legacy.ChatCompletion.create(  # type: ignore[attr-defined]
            model=model,
            messages=messages,
            temperature=0,
        )
        # legacy returns dict-like
        return resp["choices"][0]["message"]["content"] or ""
    else:
        raise RuntimeError("OpenAI SDK not available")

def _transcribe_file(file_path: str) -> str:
    """
    Transcribe an audio file using Whisper (or 4o-transcribe if available).
    Returns text; raises on error.
    """
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not set")

    # Prefer Whisper; fall back if you’ve provisioned 4o-transcribe
    if NEW_SDK and client:
        try:
            tr = client.audio.transcriptions.create(
                model="whisper-1",
                file=open(file_path, "rb"),
            )
            return getattr(tr, "text", "") or ""
        except Exception:
            # Optional: try 4o-transcribe if your org has it enabled
            tr = client.audio.transcriptions.create(
                model="gpt-4o-transcribe",
                file=open(file_path, "rb"),
            )
            return getattr(tr, "text", "") or ""
    elif openai_legacy:
        # Legacy package
        try:
            tr = openai_legacy.Audio.transcriptions.create(  # type: ignore[attr-defined]
                model="whisper-1",
                file=open(file_path, "rb"),
            )
            # legacy: dict
            return (tr.get("text") or "") if isinstance(tr, dict) else ""
        except Exception:
            tr = openai_legacy.Audio.transcriptions.create(  # type: ignore[attr-defined]
                model="gpt-4o-transcribe",
                file=open(file_path, "rb"),
            )
            return (tr.get("text") or "") if isinstance(tr, dict) else ""
    else:
        raise RuntimeError("OpenAI SDK not available")

# ---------- AI endpoints ----------

@app.post("/api/ask")
def api_ask():
    """
    Accepts:
    - JSON with {"messages":[...]} (chat format) OR {"prompt": "..."} / {"text":"..."}
    Returns: {"text": "..."} or {"error": "..."}
    """
    try:
        data = request.get_json(silent=True) or {}
        messages = data.get("messages")
        if not messages:
            prompt = (data.get("prompt") or data.get("text") or "").strip()
            if not prompt:
                return jsonify(error="Missing 'messages' or 'prompt'"), 400
            messages = [{"role": "system", "content": "You are Nova: concise, warm, helpful."},
                        {"role": "user", "content": prompt}]
        text = _chat(messages)
        return jsonify(text=text), 200
    except Exception as e:
        app.logger.exception("api_ask failed")
        # Make invalid key errors obvious to the client (helpful during setup)
        msg = str(e)
        if "api key" in msg.lower():
            return jsonify(error="OpenAI API key error. Check OPENAI_API_KEY in your .env."), 500
        return jsonify(error=msg), 500

@app.post("/api/transcribe")
def api_transcribe():
    """
    Multipart form-data: file=<audio-file>
    Returns: {"transcript":"..."}
    """
    try:
        if "file" not in request.files:
            return jsonify(error="No file provided under form field 'file'"), 400
        f = request.files["file"]
        # persist to tmp so both SDK variants can read a real file handle
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            f.save(tmp.name)
            tmp.flush()
            text = _transcribe_file(tmp.name)
        return jsonify(transcript=text or ""), 200
    except Exception as e:
        app.logger.exception("api_transcribe failed")
        return jsonify(error=str(e)), 500

# ---------- Main ----------

if __name__ == "__main__":
    # Default to 5055 since your current setup uses that; override via PORT in .env
    port = int(os.getenv("PORT", "5055"))
    app.run(host="0.0.0.0", port=port)

from flask import jsonify

@app.get("/diag/ssl")
def diag_ssl():
    import requests, certifi, ssl, os
    info = {
        "SSL_CERT_FILE": os.environ.get("SSL_CERT_FILE"),
        "REQUESTS_CA_BUNDLE": os.environ.get("REQUESTS_CA_BUNDLE"),
        "certifi.where()": certifi.where(),
    }
    try:
        r = requests.get("https://api.stripe.com", timeout=5, verify=certifi.where())
        info["https_ok"] = (r.status_code, "ok")
    except Exception as e:
        info["https_ok"] = ("error", str(e))
    return jsonify(info), 200


@app.get("/health")
def health():
    return jsonify({"ok": True}), 200

@app.post("/checkout/start")
def checkout_start():
    try:
        data = request.get_json(force=True) or {}
        price_id = data.get("priceId")
        amount = data.get("amount")  # cents (optional if using Price)
        currency = (data.get("currency") or "usd").lower()
        success_url = data.get("success_url") or "http://localhost:19006/success"
        cancel_url = data.get("cancel_url") or "http://localhost:19006/cancel"

        kwargs = {
            "mode": "payment",
            "success_url": success_url,
            "cancel_url": cancel_url,
        }
        if price_id:
            kwargs["line_items"] = [{"price": price_id, "quantity": 1}]
        elif amount:
            kwargs["line_items"] = [{"price_data": {"currency": currency, "product_data": {"name": "Nova Item"}, "unit_amount": int(amount)}, "quantity": 1}]
        else:
            return jsonify({"error":"missing priceId or amount"}), 400

        session = stripe.checkout.Session.create(**kwargs)
        return jsonify({"url": session.url}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400
# --- NOVA PATCH: health & routes debug ---
try:
    app  # type: ignore[name-defined]
except NameError:
    from flask import Flask
    app = Flask(__name__)

from flask import jsonify

@app.get("/health")
def health():
    return jsonify({"ok": True}), 200

@app.get("/routes")
def routes():
    return jsonify(sorted([f"{sorted(list(r.methods))} {r.rule}" for r in app.url_map.iter_rules()])), 200

# Helpful to see which file is actually running
print("USING SERVER FILE:", __file__)
# --- END NOVA PATCH ---
