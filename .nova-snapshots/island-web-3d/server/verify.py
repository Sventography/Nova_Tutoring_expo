import os
import stripe
from flask import Blueprint, request, jsonify

# Ensure Stripe has API key; server.py should set stripe.api_key from env.
# STRIPE_WEBHOOK_SECRET must be in your .env

bp = Blueprint("verify", __name__, url_prefix="/webhook")

def verify_event(payload: bytes, sig_header: str):
    secret = os.environ.get("STRIPE_WEBHOOK_SECRET")
    if not secret:
        raise RuntimeError("STRIPE_WEBHOOK_SECRET not set")
    return stripe.Webhook.construct_event(payload, sig_header, secret)

@bp.post("/stripe")
def stripe_webhook():
    try:
        payload = request.data
        sig_header = request.headers.get("Stripe-Signature", "")
        event = verify_event(payload, sig_header)
    except stripe.error.SignatureVerificationError as e:
        return jsonify({"error": f"invalid signature: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    # Minimal handler — expand for your products as needed
    t = event.get("type")
    if t == "checkout.session.completed":
        # TODO: fulfill order, grant entitlements, etc.
        pass
    elif t == "payment_intent.succeeded":
        pass

    return jsonify({"ok": True}), 200
