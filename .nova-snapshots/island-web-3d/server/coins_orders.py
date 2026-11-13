from __future__ import annotations

import os, json, time, uuid, ssl, smtplib
from email.message import EmailMessage
from pathlib import Path
from flask import Blueprint, request, jsonify

coins_bp = Blueprint("coins", __name__)

# ---------- helpers ----------
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

def send_order_email(data: dict, order_id: str):
    """
    Smart email sender:
    - If SMTP_PORT == 465 -> use SMTP_SSL (implicit SSL)
    - Else -> use STARTTLS (587 typical)
    """
    host = os.getenv("SMTP_HOST", "")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "")
    pwd  = os.getenv("SMTP_PASS", "")
    sender = os.getenv("MAIL_FROM", user or "no-reply@localhost")
    to = os.getenv("ORDERS_TO_EMAIL") or os.getenv("ADMIN_EMAIL") or user

    if not host or not to:
        return False, "SMTP not fully configured"

    subject = f"[Nova] Coin order {order_id} – {data.get('title') or data.get('itemId')}"
    # Build a plain-text body
    lines = []
    lines.append(f"Order ID: {order_id}")
    lines.append(f"Item: {data.get('title') or data.get('itemId')}")
    lines.append(f"Price (coins): {data.get('price')}")
    lines.append("")
    lines.append("Ship To:")
    lines.append(f"  {data.get('fullName','')}")
    lines.append(f"  {data.get('addr1','')}")
    if data.get('addr2'): lines.append(f"  {data.get('addr2')}")
    lines.append(f"  {data.get('city','')}, {data.get('state','')} {data.get('zip','')}")
    lines.append("")
    lines.append(f"Buyer email: {data.get('email','')}")
    body = "\n".join(lines)

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = to
    msg.set_content(body)

    context = ssl.create_default_context()
    try:
        if port == 465:
            # Implicit SSL
            with smtplib.SMTP_SSL(host, port, context=context) as server:
                if user:
                    server.login(user, pwd)
                server.send_message(msg)
        else:
            # STARTTLS
            with smtplib.SMTP(host, port) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                if user:
                    server.login(user, pwd)
                server.send_message(msg)
        return True, "sent"
    except Exception as e:
        print("Email error:", e)
        return False, str(e)

def _orders_log_path() -> Path:
    # default to server/data/orders.jsonl
    p = Path(os.getenv("ORDERS_LOG_PATH") or (Path(__file__).parent / "data" / "orders.jsonl"))
    p.parent.mkdir(parents=True, exist_ok=True)
    return p

# ---------- routes ----------
@coins_bp.route("/orders/coins/place", methods=["POST"])
def place_coin_order():
    body = request.get_json(silent=True) or {}
    # Validate input
    required = ["itemId", "title", "price", "email", "fullName", "addr1", "city", "state", "zip"]
    missing = [k for k in required if not str(body.get(k) or "").strip()]
    if missing:
        return bad(f"Missing fields: {', '.join(missing)}")

    order_id = f"coins_{uuid.uuid4().hex[:10]}"
    now_ms = int(time.time() * 1000)
    record = {
        "id": order_id,
        "createdAt": now_ms,
        "itemId": body["itemId"],
        "title": body["title"],
        "priceCoins": int(body.get("price") or 0),
        "buyer": {
            "email": body.get("email"),
            "fullName": body.get("fullName"),
            "phone": body.get("phone"),
        },
        "shipping": {
            "addr1": body.get("addr1"),
            "addr2": body.get("addr2"),
            "city": body.get("city"),
            "state": body.get("state"),
            "zip": body.get("zip"),
            "country": body.get("country") or "US",
        },
    }

    # Append to jsonl log (best-effort)
    try:
        logp = _orders_log_path()
        with logp.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    except Exception as e:
        print("Order log error:", e)

    # Email (best-effort)
    sent, msg = send_order_email({
        "itemId": record["itemId"],
        "title": record["title"],
        "price": record["priceCoins"],
        "email": record["buyer"].get("email"),
        "fullName": record["buyer"].get("fullName"),
        "addr1": record["shipping"].get("addr1"),
        "addr2": record["shipping"].get("addr2"),
        "city": record["shipping"].get("city"),
        "state": record["shipping"].get("state"),
        "zip": record["shipping"].get("zip"),
    }, order_id)

    resp = {"ok": True, "orderId": order_id}
    if not sent:
        resp["message"] = msg
    return ok(resp)
