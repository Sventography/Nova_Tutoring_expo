import os
from flask import Flask, jsonify, request, Blueprint
from flask_cors import CORS
from dotenv import load_dotenv
import stripe
from .webhooks import bp as webhooks_bp
from .events import bp as events_bp
from urllib.parse import urljoin

load_dotenv()
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

app = Flask(__name__)
CORS(app)

if webhooks_bp.name not in app.blueprints:
    app.register_blueprint(webhooks_bp)
if events_bp.name not in app.blueprints:
    app.register_blueprint(events_bp)

@app.post("/payments/intent")
def create_intent():
    try:
        data = request.get_json(silent=True) or {}
        amount = int(data.get("amount", 500))
        currency = data.get("currency", "usd")
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            automatic_payment_methods={"enabled": True},
        )
        return jsonify({"clientSecret": intent.client_secret}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.post("/checkout/start")
def checkout_start():
    data = request.get_json(silent=True) or {}
    price_id = data.get("priceId")
    amount = data.get("amount")
    currency = data.get("currency", "usd")
    success_url = data.get("success_url") or urljoin(request.host_url, "__diag/health")
    cancel_url = data.get("cancel_url") or urljoin(request.host_url, "__diag/health")
    try:
        if price_id:
            sess = stripe.checkout.Session.create(
                mode="payment",
                line_items=[{"price": price_id, "quantity": 1}],
                success_url=success_url,
                cancel_url=cancel_url,
            )
        else:
            amt = int(amount or 500)
            sess = stripe.checkout.Session.create(
                mode="payment",
                line_items=[{
                    "price_data": {
                        "currency": currency,
                        "product_data": {"name": "Nova Item"},
                        "unit_amount": amt
                    },
                    "quantity": 1
                }],
                success_url=success_url,
                cancel_url=cancel_url,
            )
        return jsonify({"url": sess.url}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.get("/checkout")
def checkout_placeholder():
    return jsonify(error="use POST /checkout/start"), 405

diag = Blueprint("diag", __name__, url_prefix="/__diag")

@diag.get("/")
def diag_root():
    return jsonify(status="ok", service="payments"), 200

@diag.get("/health")
def diag_health():
    return jsonify(status="ok"), 200

if "diag" not in app.blueprints:
    app.register_blueprint(diag)

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8787"))
    app.run(host="0.0.0.0", port=port, debug=True)
