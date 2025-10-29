from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/ask", methods=["POST"])
def ask():
  data = request.get_json(force=True) or {}
  q = (data.get("question") or "").strip()
  if not q:
      return jsonify(error="missing question"), 400
  # TODO: replace with your OpenAI/LLM call
  return jsonify(answer=f"You asked: {q}  — (stubbed server reply)")

if __name__ == "__main__":
  app.run(host="0.0.0.0", port=5055, debug=True)
