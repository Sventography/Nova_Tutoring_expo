from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS
import os, threading, base64, uuid

app = Flask(__name__)
CORS(app)

ALLOWED = {"png","jpg","jpeg","webp"}
MAX_MB = 5
UPLOAD_DIR = "uploads/avatars"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/upload/avatar")
def upload_avatar():
    f = request.files.get("file")
    if not f:
        return jsonify({"error":"no_file"}), 400
    ext = f.filename.rsplit(".",1)[-1].lower()
    if ext not in ALLOWED:
        return jsonify({"error":"bad_type"}), 400
    f.seek(0, os.SEEK_END)
    size = f.tell()
    f.seek(0)
    if size > MAX_MB*1024*1024:
        return jsonify({"error":"too_big"}), 400
    name = secure_filename(f.filename)
    path = os.path.join(UPLOAD_DIR, name)
    f.save(path)
    base = request.host_url.rstrip("/")
    return jsonify({"url": f"{base}/{path}"})

coins = {}
lock = threading.Lock()

@app.get("/coins/balance")
def coins_balance():
    user = request.args.get("user","default")
    with lock:
        bal = coins.get(user, 0)
    return jsonify({"user":user,"balance":bal})

@app.post("/coins/add")
def coins_add():
    data = request.get_json(silent=True) or {}
    user = data.get("user","default")
    amount = int(data.get("amount",0))
    reason = data.get("reason","")
    with lock:
        coins[user] = coins.get(user,0) + amount
        bal = coins[user]
    return jsonify({"user":user,"delta":amount,"reason":reason,"balance":bal})

@app.post("/ask")
def ask():
    data = request.get_json(silent=True) or {}
    prompt = data.get("prompt","").strip()
    if not prompt:
        return jsonify({"answer":"*pthhhht!* 💨 Nova giggles: you forgot to ask me something, silly!","latency_ms":0})
    answer = f"Nova says: I hear you — '{prompt}'. 💨 *pffft*"
    return jsonify({"answer":answer,"latency_ms":0})

AUDIO_DIR = "uploads/audio"
os.makedirs(AUDIO_DIR, exist_ok=True)
AUDIO_ALLOWED = {"m4a","wav","mp3","webm","ogg"}

@app.post("/voice/transcribe")
def voice_transcribe():
    f = request.files.get("audio") or request.files.get("file")
    if f:
        ext = f.filename.rsplit(".",1)[-1].lower()
        if ext not in AUDIO_ALLOWED:
            return jsonify({"error":"bad_type"}), 400
        name = secure_filename(f.filename) or f"{uuid.uuid4().hex}.{ext}"
        path = os.path.join(AUDIO_DIR, name)
        f.save(path)
        return jsonify({"transcript":"(stub) voice received","path":path})
    data = request.get_json(silent=True) or {}
    b64 = data.get("audio_b64")
    if b64:
        raw = base64.b64decode(b64)
        name = f"{uuid.uuid4().hex}.bin"
        path = os.path.join(AUDIO_DIR, name)
        with open(path, "wb") as out:
            out.write(raw)
        return jsonify({"transcript":"(stub) voice received","path":path})
    return jsonify({"error":"no_audio"}), 400

@app.get("/health")
def health():
    return jsonify({"ok":True})

if __name__ == "__main__":
    app.run(port=5050, debug=True)
