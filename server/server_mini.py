import os, certifi
from pathlib import Path
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from flask_cors import CORS

# Force correct CA bundle for TLS (Stripe)
os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["REQUESTS_CA_BUNDLE"] = os.environ["SSL_CERT_FILE"]

import stripe

# Load .env from this folder
load_dotenv(dotenv_path=Path(__file__).with_name('.env'))
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

@app.get("/health")
def health():
    return jsonify({"ok": True}), 200

@app.post("/checkout/start")
def checkout_start():
    try:
        data = request.get_json(force=True) or {}
        price_id = data.get("priceId")
        amount = data.get("amount")
        currency = (data.get("currency") or "usd").lower()
        success_url = data.get("success_url") or "http://localhost:19006/success"
        cancel_url  = data.get("cancel_url")  or "http://localhost:19006/cancel"

        kwargs = {
            "mode": "payment",
            "success_url": success_url,
            "cancel_url": cancel_url,
        }
        if price_id:
            kwargs["line_items"] = [{"price": price_id, "quantity": 1}]
        elif amount:
            kwargs["line_items"] = [{
                "price_data": {
                    "currency": currency,
                    "product_data": {"name": "Nova Item"},
                    "unit_amount": int(amount),
                },
                "quantity": 1
            }]
        else:
            return jsonify({"error": "missing priceId or amount"}), 400

        session = stripe.checkout.Session.create(**kwargs)
        return jsonify({"url": session.url}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    # Run on the same port your app expects
    app.run(host="0.0.0.0", port=8787)
