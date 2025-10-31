import os, json, logging
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv
load_dotenv()

bp = Blueprint("checkout", __name__)
log = logging.getLogger("checkout")
log.setLevel(logging.INFO)

def _require_secret():
  sk = os.environ.get("STRIPE_SECRET_KEY")
  if not sk:
    return None, (jsonify({"error":"Missing STRIPE_SECRET_KEY on server"}), 500)
  try:
    import stripe
    stripe.api_key = sk
    return stripe, None
  except Exception as e:
    return None, (jsonify({"error": f"Stripe import/error: {e}"}), 500)

def _mk_success_cancel(data):
  success = data.get("success_url") or "http://localhost:8081/?purchase=success"
  cancel  = data.get("cancel_url")  or "http://localhost:8081/?purchase=cancel"
  return success, cancel

@bp.post("/checkout/start")
def checkout_start():
  return _checkout_common()

@bp.post("/api/checkout/start")
def api_checkout_start():
  return _checkout_common()

def _checkout_common():
  data = request.get_json(silent=True) or {}
  log.info("Checkout start: %s", json.dumps(data))
  stripe, err = _require_secret()
  if err: return err
  success, cancel = _mk_success_cancel(data)

  # Preferred: use a Stripe Price ID (maps to your products)
  price_id = data.get("priceId") or data.get("price_id")
  # Alternative: accept raw amount/currency in cents (e.g., {"amount": 500, "currency": "usd"})
  amount = data.get("amount")
  currency = (data.get("currency") or "usd").lower()

  try:
    if price_id:
      session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[{"price": price_id, "quantity": int(data.get("quantity") or 1)}],
        success_url=success,
        cancel_url=cancel,
      )
    elif amount:
      session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[{
          "price_data": {
            "currency": currency,
            "product_data": {"name": data.get("name") or "Nova Purchase"},
            "unit_amount": int(amount),
          },
          "quantity": int(data.get("quantity") or 1),
        }],
        success_url=success,
        cancel_url=cancel,
      )
    else:
      return jsonify({"error":"Provide priceId or amount"}), 400

    return jsonify({"id": session.id, "url": session.url, "success_url": success, "cancel_url": cancel}), 200
  except Exception as e:
    log.exception("Stripe session error")
    return jsonify({"error": str(e)}), 500
