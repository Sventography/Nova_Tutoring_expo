import os
from flask import Flask, request, jsonify
try:
    # If running as a module (python3 -m server.gmail_app)
    from server.verify import bp as verify_bp
except ImportError:
    # Fallback if running directly
    from verify import bp as verify_bp

app = Flask(__name__)
app.register_blueprint(verify_bp)

@app.route("/")
def home():
    return "Nova Tutoring Gmail API is running ✨"

@app.route("/health")
def health():
    return jsonify({"ok": True})

@app.route("/send_certificate", methods=["POST"])
def send_cert():
    try:
        data = request.get_json(force=True)
        to = data.get("to")
        username = data.get("username", "Student")
        score = data.get("score", "0")
        topic = data.get("topic", "Quiz")

        if not to:
            return jsonify({"status": "error", "error": "Missing 'to' email"}), 400

        # Import inside the function to avoid circular import on startup
        try:
            from server.gmail_service import send_certificate
        except ImportError:
            from gmail_service import send_certificate

        msg_id = send_certificate(to, username, score, topic)
        return jsonify({"status": "success", "messageId": msg_id}), 200
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route("/test_send", methods=["GET"])
def test_send():
    """
    Quick browser test:
      http://127.0.0.1:5050/test_send?to=contact.novatutoring@gmail.com&username=Eric%20Svenningson&topic=Algebra&score=100
    If 'to' is omitted, falls back to NOVA_TEST_TO or contact.novatutoring@gmail.com
    """
    to = request.args.get("to") or os.getenv("NOVA_TEST_TO", "contact.novatutoring@gmail.com")
    username = request.args.get("username", "Test Student")
    topic = request.args.get("topic", "Algebra")
    score = request.args.get("score", "100")

    try:
        try:
            from server.gmail_service import send_certificate
        except ImportError:
            from gmail_service import send_certificate

        msg_id = send_certificate(to, username, score, topic)
        base_url = os.getenv("NOVA_BASE_URL", "http://127.0.0.1:5050")
        verify_url = f"{base_url}/verify?user={username}&topic={topic}&score={score}"
        return jsonify({
            "status": "queued",
            "to": to,
            "username": username,
            "topic": topic,
            "score": score,
            "messageId": msg_id,
            "verify_url": verify_url
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5050, debug=True)
