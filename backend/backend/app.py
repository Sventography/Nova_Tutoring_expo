import os, json, threading
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv, find_dotenv
import stripe

env_path = find_dotenv(usecwd=True)
load_dotenv(env_path if env_path else None)

def _mask(v, show=4):
    if not v: return ""
    return v if len(v) <= show*2 else f"{v[:show]}…{v[-show:]}"

print(f"[env] loaded: {env_path or '(none)'}")
print("[stripe] mode:", "test" if "test" in (os.getenv("STRIPE_SECRET_KEY") or "") else "live")
print("[stripe] sk:", _mask(os.getenv("STRIPE_SECRET_KEY")))
print("[stripe] whsec:", _mask(os.getenv("STRIPE_WEBHOOK_SECRET")))
print("[server] CURRENCY:", os.getenv("CURRENCY", "usd"))

app = Flask(__name__)
CORS(app)

@app.get("/ping")
def ping():
    return jsonify({"ok": True})

LOCK = threading.Lock()
DB_PATH = os.path.join(os.path.dirname(__file__), "inventory.json")
INITIAL_INVENTORY = {"plushie_nova_devil": {"limit": 500, "purchased": 0, "title": "Nova Plush Head (Devil Bow)"}}

def load_db():
    if not os.path.exists(DB_PATH): save_db(INITIAL_INVENTORY)
    with open(DB_PATH, "r") as f: return json.load(f)

def save_db(data):
    with open(DB_PATH, "w") as f: json.dump(data, f, indent=2)

@app.get("/inventory")
def list_inventory():
    db = load_db()
    return jsonify({k: {**v, "remaining": max(0, v["limit"] - v["purchased"])} for k, v in db.items()})

@app.get("/inventory/<item_id>")
def get_item(item_id):
    db = load_db()
    if item_id not in db: return jsonify({"error": "unknown_item"}), 404
    v = db[item_id]
    return jsonify({**v, "remaining": max(0, v["limit"] - v["purchased"])})

@app.post("/inventory/purchase")
def purchase():
    body = request.get_json(force=True, silent=True) or {}
    item_id = body.get("item_id"); qty = int(body.get("qty", 1))
    if qty <= 0: return jsonify({"error": "bad_qty"}), 400
    with LOCK:
        db = load_db()
        if item_id not in db: return jsonify({"error": "unknown_item"}), 404
        item = db[item_id]
        remaining = max(0, item["limit"] - item["purchased"])
        if remaining < qty: return jsonify({"ok": False, "reason": "sold_out", "remaining": remaining}), 409
        item["purchased"] += qty; save_db(db)
        remaining = max(0, item["limit"] - item["purchased"])
        return jsonify({"ok": True, "remaining": remaining})

@app.post("/inventory/refund")
def refund():
    body = request.get_json(force=True, silent=True) or {}
    item_id = body.get("item_id"); qty = int(body.get("qty", 1))
    if qty <= 0: return jsonify({"error": "bad_qty"}), 400
    with LOCK:
        db = load_db()
        if item_id not in db: return jsonify({"error": "unknown_item"}), 404
        item = db[item_id]; item["purchased"] = max(0, item["purchased"] - qty)
        save_db(db)
        remaining = max(0, item["limit"] - item["purchased"])
        return jsonify({"ok": True, "remaining": remaining})

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
CURRENCY = os.getenv("CURRENCY", "usd")

COIN_PACKS = {
    "coins_1000": {"usd": 4.99, "grant": 1000, "name": "1,000 Coins"},
    "coins_5000": {"usd": 19.99, "grant": 5000, "name": "5,000 Coins"},
}

def dollars_to_cents(x): return int(round(x * 100))

@app.post("/stripe/create-payment-intent")
def create_payment_intent():
    if not stripe.api_key: return jsonify({"error": "stripe_not_configured"}), 500
    body = request.get_json(force=True, silent=True) or {}
    pack_id = body.get("pack_id"); user_id = body.get("user_id", "guest")
    pack = COIN_PACKS.get(pack_id)
    if not pack: return jsonify({"error": "unknown_pack"}), 400
    try:
        intent = stripe.PaymentIntent.create(
            amount=dollars_to_cents(pack["usd"]),
            currency=CURRENCY,
            metadata={"pack_id": pack_id, "grant": str(pack["grant"]), "user_id": user_id, "item_name": pack["name"]},
            automatic_payment_methods={"enabled": True},
        )
        return jsonify({"client_secret": intent.client_secret})
    except Exception as e:
        return jsonify({"error": "stripe_error", "message": str(e)}), 500

@app.post("/stripe/webhook")
def stripe_webhook():
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    payload = request.data; sig_header = request.headers.get("Stripe-Signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret) if webhook_secret else json.loads(payload)
    except Exception as e:
        return jsonify({"error": "webhook_invalid", "message": str(e)}), 400
    etype = event.get("type"); data = event.get("data", {}).get("object", {})
    if etype == "payment_intent.succeeded":
        metadata = data.get("metadata", {}); print("[stripe] success:", metadata)
    elif etype == "payment_intent.payment_failed":
        print("[stripe] failed:", data)
    else:
        print("[stripe] event:", etype)
    return jsonify({"ok": True})

if __name__ == "__main__":
    port = int(os.getenv("FLASK_RUN_PORT", "5050"))
    app.run(host="0.0.0.0", port=port, debug=True)
