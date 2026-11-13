import os, tempfile, importlib
from flask import Flask, request, jsonify
from flask_cors import CORS
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass
try:
    from openai import OpenAI
    openai_client = None
except Exception:
    OpenAI = None
    openai_client = None
app = Flask(__name__)
CORS(app)
_db = importlib.import_module("coins_db")
_db.init_db()
PERSONA = (
    "You are Nova: a sassy, witty, supportive AI tutor and coding assistant. "
    "Tone: confident, encouraging, with a dash of playful humor. "
    "Style: concise explanations, occasional light sarcasm, and clear step-by-step instructions. "
    "Never use pet names or intimate language. Keep it safe for all audiences while still fun and engaging."
)
def openai_enabled():
    return bool(os.getenv("OPENAI_API_KEY")) and OpenAI is not None
def get_client():
    global openai_client
    if openai_client is None and openai_enabled():
        openai_client = OpenAI()
    return openai_client
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "openai": openai_enabled()})
@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json(silent=True) or {}
    q = (data.get("question") or "").strip()
    if not q:
        return jsonify({"error": "Missing 'question'"}), 400
    if openai_enabled() and get_client() is not None:
        try:
            resp = get_client().chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": PERSONA},
                    {"role": "user", "content": q},
                ],
                temperature=0.8,
                top_p=0.9,
                presence_penalty=0.2,
                max_tokens=700,
            )
            answer = (resp.choices[0].message.content or "").strip()
        except Exception as e:
            answer = f"Sorry—there was an issue generating a response: {e}"
    else:
        answer = f"(Local demo mode) You asked: “{q}”. Add your OPENAI_API_KEY to enable Nova’s answers."
    return jsonify({"answer": answer})
@app.route("/stt", methods=["POST"])
def stt():
    if "file" not in request.files:
        return jsonify({"error": "Missing audio 'file'"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400
    with tempfile.NamedTemporaryFile(delete=False, suffix=".m4a") as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name
    text = None
    error = None
    if openai_enabled() and get_client() is not None:
        try:
            with open(tmp_path, "rb") as f:
                tr = get_client().audio.transcriptions.create(
                    model="whisper-1",
                    file=f
                )
            text = (getattr(tr, "text", None) or "").strip()
        except Exception as e:
            error = f"Transcription failed: {e}"
    else:
        text = "Voice-to-text disabled until OPENAI_API_KEY is set."
    try:
        os.remove(tmp_path)
    except Exception:
        pass
    if error:
        return jsonify({"error": error}), 500
    return jsonify({"text": text})
@app.route("/coins/balance", methods=["GET"])
def coins_balance():
    user = request.args.get("user", "default").strip() or "default"
    bal = _db.get_balance(user)
    return jsonify({"user": user, "balance": bal})
@app.route("/coins/add", methods=["POST"])
def coins_add():
    data = request.get_json(silent=True) or {}
    user = (data.get("user") or "default").strip() or "default"
    amount = int(data.get("amount") or 0)
    if amount == 0:
        return jsonify({"error": "amount must be non-zero"}), 400
    bal = _db.add_coins(user, amount)
    return jsonify({"user": user, "balance": bal})
@app.route("/coins/set", methods=["POST"])
def coins_set():
    data = request.get_json(silent=True) or {}
    user = (data.get("user") or "default").strip() or "default"
    balance = int(data.get("balance") or 0)
    bal = _db.set_balance(user, balance)
    return jsonify({"user": user, "balance": bal})
@app.route("/__routes", methods=["GET"])
def list_routes():
    return jsonify(sorted([str(r) for r in app.url_map.iter_rules()]))
if __name__ == "__main__":
    host = os.getenv("FLASK_HOST", "127.0.0.1")
    port = int(os.getenv("FLASK_PORT", "5050"))
    print("Starting Nova backend…")
    print("ENV OPENAI present:", bool(os.getenv("OPENAI_API_KEY")))
    if bool(os.getenv("OPENAI_API_KEY")):
        print("ENV OPENAI length:", len(os.getenv("OPENAI_API_KEY")))
    print("Routes:", [str(r) for r in app.url_map.iter_rules()])
    app.run(host=host, port=port, debug=True)
