import os, argparse
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from dotenv import load_dotenv
import stripe

load_dotenv()  # loads ./.env if present

app = Flask(__name__)
ALLOWED = {"http://localhost:8081", "http://127.0.0.1:8081"}

CORS(app, resources={r"/*": {"origins": list(ALLOWED)}}, supports_credentials=False)

@app.after_request
def add_cors(resp):
    origin = request.headers.get("Origin")
    if origin in ALLOWED:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Vary"] = "Origin"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return resp

def get_stripe_key() -> str:
    # support a couple env names just in case
    key = os.getenv("STRIPE_SECRET_KEY") or os.getenv("STRIPE_TEST_SECRET") or ""
    return key.strip()

def ensure_stripe_key():
    key = get_stripe_key()
    if not key:
        raise RuntimeError("STRIPE_SECRET_KEY is missing (set it in environment or in server/.env)")
    stripe.api_key = key
    # log masked so we can see it was read
    masked = key[:3] + "…" + key[-6:]
    app.logger.info(f"[stripe] using key: {masked}")
    return key

@app.get("/health")
def health():
    has_key = bool(get_stripe_key())
    return jsonify({"ok": True, "stripe_key": "present" if has_key else "missing"})

@app.route("/checkout/start", methods=["OPTIONS","POST"])
@app.route("/api/checkout/start", methods=["OPTIONS","POST"])
@app.route("/payments/checkout/start", methods=["OPTIONS","POST"])
def checkout_start():
    if request.method == "OPTIONS":
        return make_response(("", 200))
    try:
        ensure_stripe_key()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    data = request.get_json(silent=True) or {}
    origin = request.headers.get("Origin") or "http://localhost:8081"

    success_url = (data.get("success_url")
                   or f"{origin}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}")
    cancel_url  = (data.get("cancel_url")
                   or f"{origin}/checkout/cancel")

    price_id = data.get("priceId")
    amount   = data.get("amount")
    currency = (data.get("currency") or "usd").lower()
    qty      = int(data.get("quantity") or 1)

    try:
        if price_id:
            line_items = [{"price": price_id, "quantity": qty}]
        elif isinstance(amount, int) and amount > 0:
            line_items = [{
                "price_data": {
                    "currency": currency,
                    "product_data": {"name": data.get("sku") or "Nova item"},
                    "unit_amount": amount
                },
                "quantity": qty
            }]
        else:
            return jsonify({"error":"Missing priceId or amount"}), 400

        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=line_items,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=(data.get("meta") or {}),
        )
        return jsonify({"id": session.id, "url": session.url})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=int(os.environ.get("PORT", 8788)))
    args = ap.parse_args()
    app.run(host="127.0.0.1", port=args.port, debug=True)
