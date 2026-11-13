import os, argparse
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import stripe

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")

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

@app.get("/health")
def health():
    return jsonify({"ok": True})

def make_success_url(default_origin: str):
    # Safe default for dev: back to Expo web with session id
    return f"{default_origin}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"

def make_cancel_url(default_origin: str):
    return f"{default_origin}/checkout/cancel"

# Accept all shapes your app may call
@app.route("/checkout/start", methods=["OPTIONS","POST"])
@app.route("/api/checkout/start", methods=["OPTIONS","POST"])
@app.route("/payments/checkout/start", methods=["OPTIONS","POST"])
def checkout_start():
    if request.method == "OPTIONS":
        return make_response(("", 200))

    data = request.get_json(silent=True) or {}
    origin = request.headers.get("Origin") or "http://localhost:8081"

    # NEVER return success_url directly to the client—Stripe should redirect there after payment.
    success_url = data.get("success_url") or make_success_url(origin)
    cancel_url  = data.get("cancel_url")  or make_cancel_url(origin)

    # Decide price vs amount mode
    price_id = data.get("priceId")
    amount   = data.get("amount")
    currency = (data.get("currency") or "usd").lower()
    qty      = int(data.get("quantity") or 1)

    try:
        if price_id:
            line_items = [{"price": price_id, "quantity": qty}]
        elif isinstance(amount, int) and amount > 0:
            line_items = [{"price_data": {
                "currency": currency,
                "product_data": {"name": data.get("sku") or "Nova item"},
                "unit_amount": amount
            }, "quantity": qty}]
        else:
            return jsonify({"error":"Missing priceId or amount"}), 400

        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=line_items,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=(data.get("meta") or {}),
            # Optional:
            # customer_email=data.get("email")
        )

        # Return the **Stripe** URL so the frontend opens it
        return jsonify({"id": session.id, "url": session.url})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=int(os.environ.get("PORT", 8788)))
    args = ap.parse_args()
    app.run(host="127.0.0.1", port=args.port, debug=True)
