import os, json, stripe
from flask import Blueprint, request, jsonify

bp = Blueprint("webhooks", __name__)
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

@bp.post("/stripe/webhook")
def stripe_webhook():
    payload = request.get_data(as_text=True)
    sig_header = request.headers.get("Stripe-Signature", "")
    event = None
    try:
        if WEBHOOK_SECRET:
            event = stripe.Webhook.construct_event(payload, sig_header, WEBHOOK_SECRET)
        else:
            event = json.loads(payload)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    et = event.get("type")
    data = event.get("data", {}).get("object", {})
    if et == "payment_intent.succeeded":
        push_event("payment_intent.succeeded", {"id": data.get("id")})
    elif et == "payment_intent.payment_failed":
        push_event("payment_intent.payment_failed", {"id": data.get("id"), "error": data.get("last_payment_error", {})})
    elif et == "charge.succeeded":
        push_event("charge.succeeded", {"id": data.get("id")})
    else:
        push_event("event", {"type": et})

    return jsonify({"received": True})
