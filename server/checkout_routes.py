from __future__ import annotations

import os, json, time
from flask import Blueprint, request, jsonify, make_response

bp = Blueprint("checkout", __name__)

def _cors(resp):
  resp.headers["Access-Control-Allow-Origin"] = "*"
  resp.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
  resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
  return resp

def _origin() -> str:
  # Where Stripe should send the user back after checkout
  # Prefer explicit origin if you set it (like http://192.168.1.74:8081 or your web URL)
  o = (os.getenv("CHECKOUT_ORIGIN") or "").strip()
  if o:
    return o.rstrip("/")
  # dev default (matches Expo web)
  return "http://localhost:8081"

@bp.route("/checkout/start", methods=["POST", "OPTIONS"])
@bp.route("/api/checkout/start", methods=["POST", "OPTIONS"])
@bp.route("/payments/checkout/start", methods=["POST", "OPTIONS"])
def checkout_start():
  if request.method == "OPTIONS":
    return _cors(make_response(("", 200)))

  data = request.get_json(silent=True) or {}
  # Accept any of these:
  price_id = (data.get("priceId") or data.get("price_id") or data.get("price") or "").strip()
  amount = data.get("amount")
  currency = (data.get("currency") or "usd").lower().strip()
  quantity = int(data.get("quantity") or 1)

  # Return URLs (can be passed in from app)
  origin = _origin()
  success_url = (data.get("success_url") or f"{origin}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}").strip()
  cancel_url = (data.get("cancel_url") or f"{origin}/checkout/cancel").strip()

  # Optional nice-to-have info when using amount mode
  title = (data.get("title") or data.get("sku") or "Nova Purchase")
  description = (data.get("description") or "")
  images = data.get("images") or []
  image = data.get("image")
  if image and not images:
    images = [image]

  # meta passthrough
  meta = data.get("meta") or {}
  if not isinstance(meta, dict):
    meta = {"meta": str(meta)}

  # Stripe is optional: if not configured, return a clear error (no 404)
  stripe_key = (os.getenv("STRIPE_SECRET_KEY") or os.getenv("STRIPE_API_KEY") or "").strip()
  if not stripe_key:
    return _cors(jsonify({"ok": False, "error": "Stripe not configured: missing STRIPE_SECRET_KEY"})), 500

  try:
    import stripe  # type: ignore
  except Exception as e:
    return _cors(jsonify({"ok": False, "error": f"stripe import failed: {e}"})), 500

  stripe.api_key = stripe_key

  try:
    line_item = None

    if price_id:
      line_item = {"price": price_id, "quantity": quantity}
    else:
      # Amount-mode requires amount in cents
      if not isinstance(amount, int):
        try:
          amount = int(amount)
        except Exception:
          amount = 0
      if amount <= 0:
        return _cors(jsonify({"ok": False, "error": "Missing priceId or amount"})), 400

      product_data = {"name": str(title)}
      if description:
        product_data["description"] = str(description)[:500]
      # Stripe Checkout requires public https images; keep optional
      if isinstance(images, list) and images:
        product_data["images"] = [str(x) for x in images if x]

      line_item = {
        "price_data": {
          "currency": currency,
          "unit_amount": amount,
          "product_data": product_data,
        },
        "quantity": quantity,
      }

    session = stripe.checkout.Session.create(
      mode="payment",
      line_items=[line_item],
      success_url=success_url,
      cancel_url=cancel_url,
      metadata={k: str(v) for k, v in meta.items()},
    )

    return _cors(jsonify({"ok": True, "url": session.url, "id": session.id})), 200

  except Exception as e:
    return _cors(jsonify({"ok": False, "error": str(e)})), 500

@bp.get("/checkout/ping")
def ping():
  return _cors(jsonify({"ok": True, "ts": int(time.time()*1000)}))
