from __future__ import annotations

import os, re, json, time, uuid, sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

from dotenv import load_dotenv, find_dotenv
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from openai import OpenAI
from passlib.hash import bcrypt
from sqlalchemy import Column, Integer, String, DateTime, create_engine, select
from sqlalchemy.orm import declarative_base, sessionmaker

# -----------------------------------------------------------------------------
# Ensure local imports work when running "python server/app.py"
# -----------------------------------------------------------------------------
THIS_DIR = Path(__file__).resolve().parent
if str(THIS_DIR) not in sys.path:
    sys.path.insert(0, str(THIS_DIR))

# -----------------------------------------------------------------------------
# Env
# -----------------------------------------------------------------------------
load_dotenv(THIS_DIR / ".env")
load_dotenv(find_dotenv(usecwd=True) or "")
load_dotenv()  # final fallback

# -----------------------------------------------------------------------------
# App + CORS
# -----------------------------------------------------------------------------
app = Flask(__name__)

CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    supports_credentials=False,
    allow_headers=["Content-Type", "Authorization", "X-Admin-Key"],
    methods=["GET", "POST", "OPTIONS"],
)

# -----------------------------------------------------------------------------
# Blueprints
# -----------------------------------------------------------------------------
from coins_orders import coins_bp
from routes.certs_pdf import bp as certs_pdf_bp
from routes.verify import bp as verify_bp

app.register_blueprint(certs_pdf_bp)
app.register_blueprint(verify_bp)
app.register_blueprint(coins_bp)

# Stripe checkout routes (POST /checkout/start, /api/checkout/start, /payments/checkout/start)
try:
    from checkout_routes import bp as checkout_bp
    if "checkout" not in app.blueprints:
        app.register_blueprint(checkout_bp)
except Exception as e:
    print("[checkout_bp] register skip/error:", e)

# Optional admin blueprints
try:
    from admin_routes import admin_bp as _admin_bp
    if "admin_bp" not in app.blueprints:
        app.register_blueprint(_admin_bp)
except Exception as e:
    print("[admin_bp] register skip/error:", e)

try:
    from admin_debug import admin_debug as _admin_debug
    if "admin_debug" not in app.blueprints:
        app.register_blueprint(_admin_debug)
except Exception as e:
    print("[admin_debug] register skip/error:", e)

# -----------------------------------------------------------------------------
# Mailer (single source of truth)
# -----------------------------------------------------------------------------
from mailer import send_email, send_admin_and_buyer

# -----------------------------------------------------------------------------
# DB (users)
# -----------------------------------------------------------------------------
Base = declarative_base()
DB_PATH = THIS_DIR / "nova.db"
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
Session = sessionmaker(bind=engine)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, default="")
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(engine)

# -----------------------------------------------------------------------------
# Auth utils
# -----------------------------------------------------------------------------
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
ADMIN_KEY = os.getenv("ADMIN_KEY", "")
serializer = URLSafeTimedSerializer(SECRET_KEY)

def make_token(user_id: int) -> str:
    return serializer.dumps({"uid": user_id}, salt="access")

def verify_token(token: str, max_age: int = 60 * 60 * 24 * 7) -> int | None:
    try:
        data = serializer.loads(token, salt="access", max_age=max_age)
        return int(data.get("uid"))
    except (BadSignature, SignatureExpired):
        return None

def get_uid_from_header() -> int | None:
    auth = request.headers.get("Authorization", "")
    token = auth.replace("Bearer ", "").strip()
    if not token:
        return None
    return verify_token(token)

def valid_email(s: str) -> bool:
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", s or ""))

# -----------------------------------------------------------------------------
# JSON helpers + CORS helper
# -----------------------------------------------------------------------------
def ok(data=None, **kw):
    base = {"ok": True}
    if data is not None:
        base.update(data if isinstance(data, dict) else {"data": data})
    base.update(kw)
    return jsonify(base)

def bad(msg, code=400, **kw):
    base = {"ok": False, "error": msg}
    base.update(kw)
    return jsonify(base), code

def _corsify(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS, GET"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Admin-Key"
    return resp

# -----------------------------------------------------------------------------
# Debug: identify which app is running / which blueprints loaded
# -----------------------------------------------------------------------------
@app.get("/__which_app")
def __which_app():
    return jsonify({
        "ok": True,
        "file": __file__,
        "blueprints": sorted(list(app.blueprints.keys())),
    })

# -----------------------------------------------------------------------------
# Auth routes
# -----------------------------------------------------------------------------
@app.post("/auth/register")
def register():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    name = (body.get("name") or "").strip()
    pw = body.get("password") or ""
    cpw = body.get("confirm") or ""

    if not valid_email(email):
        return bad("invalid email")
    if len(pw) < 8:
        return bad("password must be at least 8 characters")
    if pw != cpw:
        return bad("passwords do not match")

    with Session() as s:
        if s.scalar(select(User).where(User.email == email)):
            return bad("email already registered")
        u = User(email=email, name=name, password_hash=bcrypt.hash(pw))
        s.add(u)
        s.commit()
        token = make_token(u.id)
        return ok({"token": token, "user": {"id": u.id, "email": u.email, "name": u.name}})

@app.post("/auth/login")
def login():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    pw = body.get("password") or ""

    with Session() as s:
        u = s.scalar(select(User).where(User.email == email))
        if not u or not bcrypt.verify(pw, u.password_hash):
            return bad("invalid credentials", 401)
        token = make_token(u.id)
        return ok({"token": token, "user": {"id": u.id, "email": u.email, "name": u.name}})

@app.post("/auth/request-reset")
def request_reset():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    if not valid_email(email):
        return bad("invalid email")

    with Session() as s:
        u = s.scalar(select(User).where(User.email == email))
        if not u:
            return ok({"sent": True})

        token = serializer.dumps({"uid": u.id}, salt="reset")
        base = os.getenv("APP_BASE_URL", "http://localhost:3000")
        link = f"{base}/reset?token={token}"

        subject = "Nova password reset"
        body_text = (
            "Hi,\n\n"
            "Use this link to reset your Nova password:\n"
            f"{link}\n\n"
            "This link expires in 1 hour."
        )

        sent = False
        try:
            sent = bool(send_email(u.email, subject, body_text))
        except Exception as e:
            print("[auth/reset] email error:", e)

        return ok({"sent": bool(sent)})

@app.post("/auth/reset")
def reset_pw():
    body = request.get_json(silent=True) or {}
    token = body.get("token") or ""
    pw = body.get("password") or ""
    cpw = body.get("confirm") or ""

    if len(pw) < 8:
        return bad("password must be at least 8 characters")
    if pw != cpw:
        return bad("passwords do not match")

    try:
        data = serializer.loads(token, salt="reset", max_age=3600)
        uid = int(data.get("uid"))
    except (BadSignature, SignatureExpired):
        return bad("invalid or expired token")

    with Session() as s:
        u = s.get(User, uid)
        if not u:
            return bad("user not found", 404)
        u.password_hash = bcrypt.hash(pw)
        s.commit()
        return ok({"reset": True})

@app.get("/auth/me")
def me():
    auth = request.headers.get("Authorization", "")
    token = auth.replace("Bearer ", "").strip()
    uid = verify_token(token)
    if not uid:
        return bad("unauthorized", 401)

    with Session() as s:
        u = s.get(User, uid)
        if not u:
            return bad("unauthorized", 401)
        return ok({"user": {"id": u.id, "email": u.email, "name": u.name}})

# -----------------------------------------------------------------------------
# OpenAI passthrough
# -----------------------------------------------------------------------------
client = None
api_key = os.getenv("OPENAI_API_KEY")
if api_key:
    try:
        client = OpenAI(api_key=api_key)
    except Exception:
        client = None

def llm_answer(prompt: str) -> str | None:
    if not client:
        return None
    try:
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        resp = client.chat.completions.create(
            model=model,
            temperature=0.6,
            messages=[
                {"role": "system", "content": "You are Nova — a sharp, sassy tutor with playful flair. Be concise and clear."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=400,
        )
        return (resp.choices[0].message.content or "").strip()
    except Exception as e:
        return f"Nova hiccup: {e}"

@app.post("/ask")
def ask():
    data = request.get_json(silent=True) or {}
    q = (data.get("question") or "").strip()
    if not q:
        return bad("empty question")
    ans = llm_answer(q)
    if not ans:
        ans = f"Sassy Nova here. You asked: “{q}”. No OpenAI key loaded."
    return ok({"answer": ans})

# -----------------------------------------------------------------------------
# Health
# -----------------------------------------------------------------------------
@app.get("/health")
def health():
    return ok({"status": "ok", "ts": int(time.time() * 1000)})

# -----------------------------------------------------------------------------
# In-memory store for coins + orders (swap to real DB later)
# -----------------------------------------------------------------------------
STATE: Dict[str, Any] = {
    "balances": {},
    "reservations": {},
    "orders": [],
}
RESERVATION_TTL_SEC = 15 * 60

def user_key() -> str:
    uid = get_uid_from_header()
    return str(uid) if uid is not None else "default_user"

def get_balance(uid: str) -> int:
    return int(STATE["balances"].setdefault(uid, 500_000))

def set_balance(uid: str, n: int) -> None:
    STATE["balances"][uid] = int(max(0, n))

def now_ms() -> int:
    return int(time.time() * 1000)

def mint_reservation_id() -> str:
    return f"rsv_{uuid.uuid4().hex[:10]}"

def _log_order_jsonl(order: dict):
    try:
        path = THIS_DIR / "orders.log"
        with path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(order, ensure_ascii=False) + "\n")
    except Exception as e:
        print("[orders.log] write error:", e)

def _format_order_email(order: dict) -> tuple[str, str]:
    title = order.get("title") or order.get("sku") or "Order"
    created = order.get("createdAt")
    when = ""
    try:
        when = datetime.fromtimestamp(int(created) / 1000).isoformat() if created else ""
    except Exception:
        when = str(created or "")

    sh = order.get("shipping") or {}
    lines = []
    lines.append(f"Order ID: {order.get('id')}")
    lines.append(f"Status: {order.get('status')}")
    lines.append(f"Created: {when}")
    lines.append("")
    lines.append(f"Item: {title}")
    lines.append(f"SKU: {order.get('sku')}")
    if order.get("priceCoins") is not None:
        lines.append(f"Price (coins): {order.get('priceCoins')}")
    lines.append("")
    lines.append("Ship To:")
    lines.append(f"  {sh.get('name','')}")
    lines.append(f"  {sh.get('address1','')}")
    if sh.get("address2"):
        lines.append(f"  {sh.get('address2')}")
    lines.append(f"  {sh.get('city','')}, {sh.get('state','')} {sh.get('zip','')}")
    lines.append(f"  {sh.get('country','US')}")
    if sh.get("size"):
        lines.append(f"  Size: {sh.get('size')}")
    lines.append("")
    lines.append(f"Buyer email: {sh.get('email','')}")
    if sh.get("phone"):
        lines.append(f"Buyer phone: {sh.get('phone')}")
    subj = f"NEW ORDER — {title} — {order.get('id')}"
    return subj, "\n".join(lines)

# -----------------------------------------------------------------------------
# Coin checkout: start
# -----------------------------------------------------------------------------
@app.route("/orders/coin/start", methods=["POST", "OPTIONS"])
def orders_coin_start():
    if request.method == "OPTIONS":
        return _corsify(make_response(("", 200)))

    body = request.get_json(silent=True) or {}
    item_id = str(body.get("itemId") or "").strip()
    title = str(body.get("title") or "").strip()
    price_coins = int(body.get("priceCoins") or 0)
    meta = body.get("meta") or {}

    if not item_id or not title or price_coins <= 0:
        return _corsify(make_response(bad("Invalid request")))

    uid = user_key()
    rsv_id = mint_reservation_id()
    STATE["reservations"][rsv_id] = {
        "id": rsv_id,
        "userId": uid,
        "itemId": item_id,
        "title": title,
        "priceCoins": price_coins,
        "meta": dict(meta) if isinstance(meta, dict) else {},
        "status": "pending",
        "createdAt": now_ms(),
    }

    return _corsify(ok({"reservationId": rsv_id}))

# -----------------------------------------------------------------------------
# Coin checkout: confirm + EMAILS
# -----------------------------------------------------------------------------
@app.route("/orders/coin/confirm", methods=["POST", "OPTIONS"])
def orders_coin_confirm():
    if request.method == "OPTIONS":
        return _corsify(make_response(("", 200)))

    body = request.get_json(silent=True) or {}
    reservation_id = str(body.get("reservationId") or "").strip()
    shipping = body.get("shipping") or {}

    if not reservation_id:
        return _corsify(make_response(bad("Missing reservationId")))

    rsv = STATE["reservations"].get(reservation_id)
    if not rsv:
        return _corsify(make_response(bad("Invalid or expired reservation", 404)))

    if (now_ms() - int(rsv["createdAt"])) > (RESERVATION_TTL_SEC * 1000):
        rsv["status"] = "expired"
        return _corsify(make_response(bad("Reservation expired", 410)))

    if rsv["status"] != "pending":
        return _corsify(make_response(bad(f"Reservation is {rsv['status']}")))

    required = ["email", "name", "address1", "city", "state", "zip"]
    missing = [k for k in required if not str(shipping.get(k) or "").strip()]
    if missing:
        return _corsify(make_response(bad(f"Missing fields: {', '.join(missing)}")))

    buyer_email = (shipping.get("email") or "").strip()
    if not valid_email(buyer_email):
        return _corsify(make_response(bad("Invalid email")))

    size = (shipping.get("size") or rsv.get("meta", {}).get("size") or None)
    if size is not None:
        size = str(size).upper().strip()

    uid = rsv["userId"]
    price = int(rsv["priceCoins"])
    prev_bal = get_balance(uid)
    if prev_bal < price:
        return _corsify(make_response(bad("Insufficient balance", 402)))

    new_bal = prev_bal - price
    set_balance(uid, new_bal)

    rsv["status"] = "confirmed"
    order_id = f"ord_{uuid.uuid4().hex[:10]}"
    order = {
        "id": order_id,
        "userId": uid,
        "sku": rsv["itemId"],
        "title": rsv["title"],
        "status": "paid",
        "createdAt": now_ms(),
        "priceCoins": price,
        "shipping": {
            "email": buyer_email,
            "name": shipping.get("name"),
            "phone": shipping.get("phone"),
            "address1": shipping.get("address1"),
            "address2": shipping.get("address2"),
            "city": shipping.get("city"),
            "state": shipping.get("state"),
            "zip": shipping.get("zip"),
            "country": shipping.get("country") or "US",
            "size": size,
        },
        "meta": rsv.get("meta") or {},
        "reservationId": reservation_id,
    }

    STATE["orders"].insert(0, order)
    _log_order_jsonl(order)

    # EMAIL admin + buyer
    admin_subj, admin_body = _format_order_email(order)
    buyer_subj = f"We received your order — {order_id}"
    buyer_body = (
        "Thanks! We received your order.\n\n"
        + admin_body
        + "\n\n— Nova Tutoring"
    )

    email_res = {}
    try:
        email_res = send_admin_and_buyer(
            buyer_email=buyer_email,
            admin_subject=admin_subj,
            admin_body=admin_body,
            buyer_subject=buyer_subj,
            buyer_body=buyer_body,
        )
        print("[coin-order] email:", email_res)
    except Exception as e:
        print("[coin-order] email error:", e)
        email_res = {"sentAdmin": False, "sentBuyer": False}

    return _corsify(ok({"order": order, "balance": new_bal, **email_res}))

# -----------------------------------------------------------------------------
# Admin routes (simple)
# -----------------------------------------------------------------------------
@app.get("/admin/orders")
def admin_orders():
    key = request.headers.get("X-Admin-Key", "")
    if not ADMIN_KEY or key != ADMIN_KEY:
        return bad("unauthorized", 401)
    return ok({"orders": STATE.get("orders", [])})

@app.get("/admin/orders/log")
def admin_orders_log():
    key = request.headers.get("X-Admin-Key", "")
    if not ADMIN_KEY or key != ADMIN_KEY:
        return bad("unauthorized", 401)

    try:
        limit = int(request.args.get("limit", "50"))
        offset = int(request.args.get("offset", "0"))
    except Exception:
        limit, offset = 50, 0

    items = []
    try:
        path = THIS_DIR / "orders.log"
        if path.exists():
            with path.open("r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        items.append(json.loads(line))
                    except Exception:
                        pass
        items.sort(key=lambda x: x.get("createdAt", 0), reverse=True)
    except Exception as e:
        return bad(f"log read error: {e}", 500)

    end = offset + limit
    return ok({"orders": items[offset:end], "total": len(items), "offset": offset, "limit": limit})

# -----------------------------------------------------------------------------
# API parity: /api/order-email (manual trigger; keeps working)
# -----------------------------------------------------------------------------
@app.route("/api/order-email", methods=["POST", "OPTIONS"])
def api_order_email():
    if request.method == "OPTIONS":
        return _corsify(make_response(("", 200)))

    b = request.get_json(silent=True) or {}
    order_id = (b.get("id") or b.get("orderId") or f"ord_{uuid.uuid4().hex[:10]}").strip()
    title = (b.get("title") or b.get("itemTitle") or b.get("sku") or "Order").strip()

    shipping = {
        "email": (b.get("email") or b.get("buyerEmail") or "").strip(),
        "name": (b.get("name") or b.get("buyerName") or "").strip(),
        "phone": (b.get("phone") or "").strip(),
        "address1": (b.get("address1") or "").strip(),
        "address2": (b.get("address2") or "").strip(),
        "city": (b.get("city") or "").strip(),
        "state": (b.get("state") or "").strip(),
        "zip": (b.get("postalCode") or b.get("zip") or "").strip(),
        "country": (b.get("country") or "US").strip(),
        "size": (b.get("size") or None),
    }

    buyer_email = shipping.get("email") or ""
    if buyer_email and not valid_email(buyer_email):
        return _corsify(make_response(bad("Invalid email", 400)))

    order = {
        "id": order_id,
        "sku": (b.get("sku") or b.get("itemId") or "").strip(),
        "title": title,
        "status": (b.get("status") or "paid").strip(),
        "createdAt": int(b.get("createdAt") or now_ms()),
        "priceCoins": int(b.get("coinsPrice") or b.get("priceCoins") or 0),
        "shipping": shipping,
        "meta": {
            "category": (b.get("category") or "").strip(),
            "imageUrl": (b.get("imageUrl") or "").strip(),
            "notes": (b.get("notes") or "").strip(),
        },
    }

    _log_order_jsonl(order)

    admin_subj, admin_body = _format_order_email(order)
    buyer_subj = f"We received your order — {order_id}"
    buyer_body = (
        "Thanks! We received your order.\n\n"
        + admin_body
        + "\n\n— Nova Tutoring"
    )

    email_res = {}
    try:
        email_res = send_admin_and_buyer(
            buyer_email=buyer_email or None,
            admin_subject=admin_subj,
            admin_body=admin_body,
            buyer_subject=buyer_subj,
            buyer_body=buyer_body,
        )
    except Exception as e:
        print("[api/order-email] email error:", e)
        email_res = {"sentAdmin": False, "sentBuyer": False}

    return _corsify(ok({"orderId": order_id, **email_res}))

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    print("DB:", DB_PATH.resolve())
    print("OPENAI_API_KEY loaded:", bool(os.getenv("OPENAI_API_KEY")))
    print("SECRET_KEY present:", bool(SECRET_KEY))

    host = os.getenv("FLASK_RUN_HOST", "0.0.0.0")
    port = int(os.getenv("FLASK_RUN_PORT", "8787"))

    # 0.0.0.0 so iPhone can reach it via LAN IP
    app.run(host=host, port=port, debug=True, use_reloader=False)
