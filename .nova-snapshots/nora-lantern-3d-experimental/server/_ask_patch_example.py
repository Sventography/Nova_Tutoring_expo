from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.post("/ask")
def ask():
    data = request.get_json(force=True) or {}
    prompt = (data.get("prompt") or "").strip()
    return jsonify({"answer": f"Great question: {prompt}. (stubbed response)"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5055, debug=True)
