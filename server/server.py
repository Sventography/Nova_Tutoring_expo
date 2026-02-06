# 🔥🔥 RUNNING FIXED SERVER VERSION v3 (CHECKOUT SESSION) 🔥🔥
print("🔥🔥 RUNNING FIXED SERVER VERSION v3 (CHECKOUT SESSION) 🔥🔥")

import os
from flask import Flask, request, jsonify
from flask_cors import CORS

try:
    import stripe
except Exception:
    stripe = None

# -------------------------------------------------
# App setup
# -------------------------------------------------

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

print("🔥🔥 FLASK APP INITIALIZED (v3) 🔥🔥")

# -------------------------------------------------
# Load environment
# -------------------------------------------------

try:
    from dotenv import load_dotenv

    base_dir = os.path.dirname(__file__)
    env_server = os.path.join(base_dir, "env", ".env.server")
    env_fallback = os.path.join(base_dir, ".env")

    if os.path.exists(env_server):
        load_dotenv(env_server)
        print("[server] loaded env:", env_server)
    elif os.path.exists(env_fallback):
        load_dotenv(env_fallback)
        print("[server] loaded env:", env_fallback)
    else:
        print("[server] no env file found")

except Exception as e:
    print("[server] dotenv load failed:", e)

# -------------------------------------------------
# Stripe setup
# -------------------------------------------------

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "").strip()

if stripe and STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY
    print("[server] Stripe secret loaded: True")
else:
    print("[server] Stripe secret loaded: False")

# -------------------------------------------------
# Health
# -------------------------------------------------

@app.get("/health")
def health():
    return jsonify(ok=True, service="nova-backend", status="up")

# -------------------------------------------------
# Checkout core
# -------------------------------------------------

def _checkout_logic():
    print("🔥🔥 CHECKOUT SESSION LOGIC HIT 🔥🔥")

    body = request.get_json(silent=True) or {}

    sku = body.get("sku")
    title = body.get("title") or sku
    amount = body.get("amount")          # cents
    quantity = int(body.get("quantity") or 1)
    currency = body.get("currency", "usd")
    method = (body.get("method") or "").lower()
    success_url = body.get("success_url")
    cancel_url = body.get("cancel_url")

    print("[server] incoming body:", body)

    if not sku:
        return jsonify(ok=False, error="missing sku"), 400

    if method != "card":
        return jsonify(ok=False, error="only card supported here"), 400

    if not amount or amount <= 0:
        return jsonify(ok=False, error="invalid amount"), 400

    if not (stripe and STRIPE_SECRET_KEY):
        return jsonify(ok=False, error="stripe not configured"), 500

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": currency,
                        "product_data": {
                            "name": title,
                        },
                        "unit_amount": int(amount),
                    },
                    "quantity": quantity,
                }
            ],
            success_url=success_url or "https://example.com/success",
            cancel_url=cancel_url or "https://example.com/cancel",
            metadata={
                "sku": sku,
                "quantity": quantity,
            },
        )

        print("[server] created Checkout Session:", session.id)

        return jsonify(
            ok=True,
            mode="card",
            url=session.url,
        )

    except Exception as e:
        print("[server] Stripe error:", e)
        return jsonify(ok=False, error=str(e)), 500

# -------------------------------------------------
# Routes
# -------------------------------------------------

@app.post("/checkout/start")
def checkout_start():
    return _checkout_logic()

@app.post("/api/checkout/start")
def checkout_start_api():
    return _checkout_logic()

# -------------------------------------------------
# Entrypoint
# -------------------------------------------------

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8787"))
    print(f"🔥🔥 STARTING SERVER v3 ON http://127.0.0.1:{port} 🔥🔥")
    app.run(host="0.0.0.0", port=port, debug=False)
