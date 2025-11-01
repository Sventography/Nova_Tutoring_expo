import os, argparse
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from dotenv import load_dotenv
import stripe

load_dotenv()
stripe.api_key = (os.getenv("STRIPE_SECRET_KEY") or "").strip()

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
    return jsonify({
        "ok": True,
        "stripe_key": "present" if bool(stripe.api_key) else "missing"
    })

def resolve_price_id_for_product(product_id: str, currency: str = "usd") -> str:
    """
    Given a Stripe product ID, return a suitable Price ID.
    Priority:
      1) product.default_price if active
      2) first active price for the product in the requested currency
    """
    # expand default_price so we can inspect it
    product = stripe.Product.retrieve(product_id, expand=["default_price"])
    # default_price can be an ID or an expanded object (when we expand)
    default_price = product.get("default_price")
    if isinstance(default_price, dict):
        # expanded object
        if default_price.get("active") and (default_price.get("currency") == currency):
            return default_price["id"]
    elif isinstance(default_price, str) and default_price:
        # fetch it to confirm currency/active
        p = stripe.Price.retrieve(default_price)
        if p.get("active") and (p.get("currency") == currency):
            return p["id"]

    # Fallback: list active prices for this product in currency
    prices = stripe.Price.list(
        product=product_id,
        active=True,
        limit=20,
    )
    for pr in prices.auto_paging_iter():
        if pr.get("currency") == currency and pr.get("active"):
            return pr["id"]

    raise ValueError(f"No active {currency.upper()} price found for product {product_id}")

def build_product_fields(data):
    """(Amount mode) Build product_data for nicer Checkout display when not using a Price."""
    sku = (data.get("sku") or "").strip()
    title = (data.get("title") or sku or "Nova Item").strip()
    description = (data.get("description") or "").strip()
    images = data.get("images") or []
    if not images:
        single = data.get("image")
        if single:
            images = [single]
    product_data = {"name": title}
    if description:
        product_data["description"] = description
    if images:
        product_data["images"] = images
    return product_data

@app.route("/checkout/start", methods=["OPTIONS","POST"])
@app.route("/api/checkout/start", methods=["OPTIONS","POST"])
@app.route("/payments/checkout/start", methods=["OPTIONS","POST"])
def checkout_start():
    if request.method == "OPTIONS":
        return make_response(("", 200))
    if not stripe.api_key:
        return jsonify({"error":"STRIPE_SECRET_KEY missing"}), 500

    data = request.get_json(silent=True) or {}
    origin = request.headers.get("Origin") or "http://localhost:8081"

    success_url = (data.get("success_url")
                   or f"{origin}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}")
    cancel_url  = (data.get("cancel_url")
                   or f"{origin}/checkout/cancel")

    price_id  = (data.get("priceId") or "").strip()
    product_id = (data.get("productId") or "").strip()
    amount   = data.get("amount")
    currency = (data.get("currency") or "usd").lower()
    qty      = int(data.get("quantity") or 1)

    try:
        if price_id:
            # Price path
            line_items = [{"price": price_id, "quantity": qty}]
        elif product_id:
            # Resolve product -> price
            resolved_price = resolve_price_id_for_product(product_id, currency=currency)
            line_items = [{"price": resolved_price, "quantity": qty}]
        elif isinstance(amount, int) and amount > 0:
            # Amount-mode (set rich product_data for better Checkout display)
            product_data = build_product_fields(data)
            line_items = [{
                "price_data": {
                    "currency": currency,
                    "product_data": product_data,
                    "unit_amount": amount
                },
                "quantity": qty
            }]
        else:
            return jsonify({"error":"Provide one of: priceId, productId, or amount"}), 400

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

@app.post("/wallet/spend")
def wallet_spend():
    data = request.get_json() or {}
    amount = int(data.get("amount") or 0)
    if amount <= 0:
        return jsonify({"ok": False, "error": "invalid_amount"}), 400
    # TODO: look up the real user balance; here we read the incoming "current" for demo
    current = int(data.get("current") or 500200)
    new_balance = max(0, current - amount)
    return jsonify({"ok": True, "balance": new_balance})

@app.post("/wallet/spend")
def wallet_spend():
    data = request.get_json() or {}
    amount = int(data.get("amount") or 0)
    if amount <= 0:
        return jsonify({"ok": False, "error": "invalid_amount"}), 400
    # TODO: look up the real user balance; here we read the incoming "current" for demo
    current = int(data.get("current") or 500200)
    new_balance = max(0, current - amount)
    return jsonify({"ok": True, "balance": new_balance})

# ==== Coin Orders: reserve, confirm, cancel (DEV DEMO) ====
import time, uuid
from typing import Dict, Any

# in-memory reservations {resv_id: {amount, itemId, title, priceCoins, expires_at}}
_COIN_RES: Dict[str, Dict[str, Any]] = {}

def _now(): return int(time.time())

@app.post("/orders/coin/start")
def coin_order_start():
    data = request.get_json() or {}
    item_id = data.get("itemId")
    title = data.get("title")
    price_coins = int(data.get("priceCoins") or 0)
    current_balance = int(data.get("currentBalance") or 0)

    if not item_id or price_coins <= 0:
        return jsonify({"ok": False, "error": "invalid_item_or_price"}), 400
    if current_balance < price_coins:
        return jsonify({"ok": False, "error": "insufficient_funds"}), 400

    rid = uuid.uuid4().hex[:24]
    _COIN_RES[rid] = {
        "amount": price_coins,
        "itemId": item_id,
        "title": title,
        "priceCoins": price_coins,
        "expires_at": _now() + 10*60,  # 10 min hold
    }
    return jsonify({"ok": True, "reservationId": rid, "expiresAt": _COIN_RES[rid]["expires_at"]})

@app.post("/orders/coin/confirm")
def coin_order_confirm():
    data = request.get_json() or {}
    rid = data.get("reservationId")
    shipping = data.get("shipping") or {}
    email = (shipping.get("email") or "").strip()

    if not rid or rid not in _COIN_RES:
        return jsonify({"ok": False, "error": "reservation_not_found"}), 400
    resv = _COIN_RES[rid]
    if resv["expires_at"] < _now():
        _COIN_RES.pop(rid, None)
        return jsonify({"ok": False, "error": "reservation_expired"}), 400

    # TODO: persist order to DB and deduct coins from user balance.
    # For DEV: simulate a new balance of (500_200 - amount)
    new_balance = max(0, 500_200 - resv["amount"])

    order_id = "ord_" + uuid.uuid4().hex[:20]
    # clear reservation
    _COIN_RES.pop(rid, None)

    return jsonify({
        "ok": True,
        "orderId": order_id,
        "balance": new_balance,
        "summary": {
            "itemId": resv["itemId"],
            "title": resv["title"],
            "priceCoins": resv["priceCoins"],
            "email": email,
            "shipping": shipping,
        }
    })

@app.post("/orders/coin/cancel")
def coin_order_cancel():
    data = request.get_json() or {}
    rid = data.get("reservationId")
    if rid and rid in _COIN_RES:
        _COIN_RES.pop(rid, None)
    return jsonify({"ok": True})
