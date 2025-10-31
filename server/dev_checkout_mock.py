from flask import Flask, request, jsonify
from flask_cors import CORS
import os
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.get("/health")
def api_health(): return jsonify(ok=True, service="dev-mock")

@app.post("/checkout/start")
def start():
    body = request.get_json(silent=True) or {}
    return jsonify(ok=True, mode=body.get("method"), sku=body.get("sku"), message="mock checkout created")

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8787"))
    app.run(host="0.0.0.0", port=port, debug=False)
