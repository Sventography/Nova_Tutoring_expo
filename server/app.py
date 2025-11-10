from __future__ import annotations
from coins_orders import coins_bp
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv, find_dotenv
import os, re, smtplib, ssl, json, time, uuid
from email.message import EmailMessage
from datetime import datetime
from pathlib import Path
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from passlib.hash import bcrypt
from sqlalchemy import Column, Integer, String, DateTime, create_engine, select
from sqlalchemy.orm import declarative_base, sessionmaker
from typing import Dict, Any
from openai import OpenAI

# -----------------------------------------------------------------------------
# Boot + CORS
# -----------------------------------------------------------------------------
load_dotenv(find_dotenv(usecwd=True)) or load_dotenv()
app = Flask(__name__)
app.register_blueprint(coins_bp)

# ---- Idempotent blueprint registration ----
try:
    from admin_routes import admin_bp as _admin_bp
    if 'admin_bp' not in app.blueprints:
        app.register_blueprint(_admin_bp)
except Exception as e:
    print('[admin_bp] register skip/error:', e)

try:
    from admin_debug import admin_debug as _admin_debug
    if 'admin_debug' not in app.blueprints:
        app.register_blueprint(_admin_debug)
except Exception as e:
    print('[admin_debug] register skip/error:', e)

# -------------------------------------------
# Allow local web dev; add other origins as needed
CORS(
    app,
    resources={r"/*": {"origins": [
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "*"
    ]}},
    supports_credentials=False,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "OPTIONS"],
)

# -----------------------------------------------------------------------------
# DB (users)
# -----------------------------------------------------------------------------
Base = declarative_base()
DB_PATH = Path(__file__).parent.joinpath("nova.db")
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
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")
ADMIN_KEY = os.getenv("ADMIN_KEY", "")
ORDERS_LOG_PATH = Path(__file__).parent.joinpath("orders.log")
os.environ['ORDERS_LOG_PATH'] = str(ORDERS_LOG_PATH)
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

# -----------------------------------------------------------------------------
# Email helper
# -----------------------------------------------------------------------------
def send_email(to_email: str, subject: str, body: str) -> bool:
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    sender = os.getenv("MAIL_FROM", smtp_user or "no-reply@localhost")
    if not smtp_host:
        print("EMAIL Fallback (no SMTP configured) ->")
        print("To:", to_email)
        print("Subject:", subject)
        print(body)
        return True
    try:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = sender
        msg["To"] = to_email
        msg.set_content(body)
        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls(context=context)
            if smtp_user:
                server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        return True
    except Exception as e:
        print("Email error:", e)
        return False

# -----------------------------------------------------------------------------
# JSON helpers
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

def valid_email(s: str) -> bool:
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", s or ""))

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
        body_text = f"Hi,\n\nUse this link to reset your Nova password:\n{link}\n\nThis link expires in 1 hour."
        sent = send_email(u.email, subject, body_text)
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
    token = auth.replace("Bearer ", "")
    uid = verify_token(token)
    if not uid:
        return bad("unauthorized", 401)
    with Session() as s:
        u = s.get(User, uid)
        if not u:
            return bad("unauthorized", 401)
        return ok({"user": {"id": u.id, "email": u.email, "name": u.name}})

# -----------------------------------------------------------------------------
# OpenAI passthrough (unchanged)
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
    return ok({"ts": int(time.time() * 1000)})

# -----------------------------------------------------------------------------
# In-memory store for coins + orders (swap to real DB later)
# -----------------------------------------------------------------------------
STATE: Dict[str, Any] = {
    "balances": {},         # userId(str) -> coins
    "reservations": {},     # rsvId -> {...}
    "orders": [],           # array of orders
}
RESERVATION_TTL_SEC = 15 * 60

def user_key() -> str:
    uid = get_uid_from_header()
    return str(uid) if uid is not None else "default_user"

def get_balance(uid: str) -> int:
    # Seed dev balance if not present
    return int(STATE["balances"].setdefault(uid, 500_000))

def set_balance(uid: str, n: int) -> None:
    STATE["balances"][uid] = int(max(0, n))

def now_ms() -> int:
    return int(time.time() * 1000)

def mint_reservation_id() -> str:
    return f"rsv_{uuid.uuid4().hex[:10]}"

# -----------------------------------------------------------------------------
# Coin checkout: start (preflight + POST)
# -----------------------------------------------------------------------------
@app.route("/orders/coin/start", methods=["POST", "OPTIONS"])
def orders_coin_start():
    if request.method == "OPTIONS":
        # Let CORS preflight succeed
        return ("", 200)

    body = request.get_json(silent=True) or {}
    item_id = str(body.get("itemId") or "").strip()
    title = str(body.get("title") or "").strip()
    price_coins = int(body.get("priceCoins") or 0)
    current_balance = int(body.get("currentBalance") or 0)
    meta = body.get("meta") or {}

    if not item_id or not title or price_coins <= 0:
        return bad("Invalid request")

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

    return ok({
        "reservationId": rsv_id,
        "echo": {
            "itemId": item_id,
            "title": title,
            "priceCoins": price_coins,
            "currentBalance": current_balance,
            "meta": meta,
        }
    })

# -----------------------------------------------------------------------------
# Coin checkout: confirm (preflight + POST)
# -----------------------------------------------------------------------------
@app.route("/orders/coin/confirm", methods=["POST", "OPTIONS"])
def orders_coin_confirm():
    if request.method == "OPTIONS":
        return ("", 200)

    body = request.get_json(silent=True) or {}
    reservation_id = str(body.get("reservationId") or "").strip()
    shipping = body.get("shipping") or {}

    if not reservation_id:
        return bad("Missing reservationId")

    rsv = STATE["reservations"].get(reservation_id)
    if not rsv:
        return bad("Invalid or expired reservation", 404)

    # TTL + status
    if (now_ms() - int(rsv["createdAt"])) > (RESERVATION_TTL_SEC * 1000):
        rsv["status"] = "expired"
        return bad("Reservation expired", 410)
    if rsv["status"] != "pending":
        return bad(f"Reservation is {rsv['status']}")

    # shipping validation
    required = ["email", "name", "address1", "city", "state", "zip"]
    missing = [k for k in required if not str(shipping.get(k) or "").strip()]
    if missing:
        return bad(f"Missing fields: {', '.join(missing)}")

    # size can come from rsv.meta.size or shipping.size
    size = (shipping.get("size") or rsv.get("meta", {}).get("size") or None)
    if size is not None:
        size = str(size).upper().strip()

    uid = rsv["userId"]
    price = int(rsv["priceCoins"])
    prev_bal = get_balance(uid)
    if prev_bal < price:
        return bad("Insufficient balance", 402)

    new_bal = prev_bal - price
    set_balance(uid, new_bal)

    # finalize order
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
            "email": shipping.get("email"),
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

    return ok({
        "order": order,
        "balance": new_bal,  # authoritative
    })

# -----------------------------------------------------------------------------
# Order helpers (email + log)
# -----------------------------------------------------------------------------
def _format_order_email(order: dict) -> tuple[str, str]:
    title = order.get('title') or order.get('sku') or 'Order'
    created = order.get('createdAt')
    when = created
    try:
        when = datetime.fromtimestamp(int(created)/1000).isoformat() if created else ''
    except Exception:
        pass
    lines = []
    lines.append(f"Order ID: {order.get('id')}")
    lines.append(f"Status: {order.get('status')}")
    lines.append(f"Created: {when}")
    lines.append("")
    lines.append(f"Item: {title}")
    lines.append(f"SKU: {order.get('sku')}")
    lines.append(f"Price (coins): {order.get('priceCoins')}")
    lines.append("")
    sh = order.get('shipping') or {}
    lines.append('Ship To:')
    lines.append(f"  {sh.get('name','')}")
    lines.append(f"  {sh.get('address1','')}")
    if sh.get('address2'): lines.append(f"  {sh.get('address2')}")
    lines.append(f"  {sh.get('city','')}, {sh.get('state','')} {sh.get('zip','')}")
    lines.append(f"  {sh.get('country','')}")
    if sh.get('size'): lines.append(f"  Size: {sh.get('size')}")
    lines.append("")
    lines.append(f"Buyer email: {sh.get('email','')}")
    subj = f"[Nova] Coin order {order.get('id')} – {title}"
    body = '\n'.join(lines)
    return subj, body

def _log_order_jsonl(order: dict):
    try:
        path = Path(__file__).parent.joinpath('orders.log')
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open('a', encoding='utf-8') as f:
            f.write(json.dumps(order, ensure_ascii=False) + '\n')
    except Exception as e:
        print('Order log error:', e)

# -----------------------------------------------------------------------------
# Admin routes for viewing orders
# -----------------------------------------------------------------------------
@app.get('/admin/orders')
def admin_orders():
    key = request.headers.get('X-Admin-Key','')
    if not ADMIN_KEY or key != ADMIN_KEY:
        return bad('unauthorized', 401)
    return ok({'orders': STATE.get('orders', [])})

@app.get('/admin/orders/log')
def admin_orders_log():
    key = request.headers.get('X-Admin-Key','')
    if not ADMIN_KEY or key != ADMIN_KEY:
        return bad('unauthorized', 401)
    try:
        limit = int(request.args.get('limit', '50'))
        offset = int(request.args.get('offset', '0'))
    except Exception:
        limit, offset = 50, 0
    items = []
    try:
        path = ORDERS_LOG_PATH
        if path.exists():
            with path.open('r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line: continue
                    try:
                        items.append(json.loads(line))
                    except Exception:
                        pass
        items.sort(key=lambda x: x.get('createdAt', 0), reverse=True)
    except Exception as e:
        return bad(f'log read error: {e}', 500)
    end = offset + limit
    return ok({'orders': items[offset:end], 'total': len(items), 'offset': offset, 'limit': limit})

# -----------------------------------------------------------------------------
# API parity: /api/order-email (customer + admin emails)
# -----------------------------------------------------------------------------
@app.route("/api/order-email", methods=["POST", "OPTIONS"])
def api_order_email():
    # CORS preflight
    if request.method == "OPTIONS":
        return ("", 200)

    b = request.get_json(silent=True) or {}

    # minimal validation to match your TS version
    order_id = (b.get("id") or "").strip()
    title = (b.get("title") or "").strip()
    if not order_id or not title:
        return bad("Invalid payload: missing id or title", 400)

    # normalize to the structure used by _format_order_email
    shipping = {
        "email": b.get("email") or "",
        "name": b.get("name") or "",
        "address1": b.get("address1") or "",
        "address2": b.get("address2") or "",
        "city": b.get("city") or "",
        "state": b.get("state") or "",
        "zip": b.get("postalCode") or "",
        "country": b.get("country") or "US",
        "size": (b.get("size") or None),
    }

    order = {
        "id": order_id,
        "sku": b.get("sku") or "",
        "title": title,
        "status": b.get("status") or "paid",
        "createdAt": int(b.get("createdAt") or now_ms()),
        "priceCoins": int(b.get("coinsPrice") or 0),
        "shipping": shipping,
        "meta": {
            "category": b.get("category") or "",
        },
    }

    # log to file (like before)
    try:
        _log_order_jsonl(order)
    except Exception as e:
        print("order log error:", e)

    # build admin + customer emails
    admin_subj, admin_body = _format_order_email(order)

    cust_email = shipping.get("email")
    cust_subj = f"Order Confirmation – {order['id']}"
    cust_body = (
        f"Thanks for your order!\n\n"
        f"{admin_body}\n\n"
        f"We'll notify you when it ships.\n"
        f"- Nova Team"
    )

    # send customer confirmation (best effort)
    if cust_email and valid_email(cust_email):
        try:
            send_email(cust_email, cust_subj, cust_body)
        except Exception as e:
            print("customer email error:", e)

    # send admin/dev notification (required)
    admin_to = os.getenv("ADMIN_EMAIL", "")
    if admin_to:
        try:
            send_email(admin_to, f"NEW ORDER: {order['title']} — {order['id']}", admin_body)
        except Exception as e:
            print("admin email error:", e)

    return ok({"sent": True})

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    print("DB:", DB_PATH.resolve())
    print("OPENAI_API_KEY loaded:", bool(os.getenv("OPENAI_API_KEY")))
    print("SECRET_KEY present:", bool(SECRET_KEY))
    host = os.getenv("FLASK_RUN_HOST", "127.0.0.1")
    port = int(os.getenv("FLASK_RUN_PORT", "8788"))  # default 8788 to match frontend
    app.run(host=host, port=port, debug=True, use_reloader=False)
