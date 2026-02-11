# 🔥🔥 RUNNING FIXED SERVER VERSION v5 (CHECKOUT + ASK + COIN ORDER EMAILS + ITEM DETAILS + SMTP DEBUG) 🔥🔥
print("🔥🔥 RUNNING FIXED SERVER VERSION v5 (CHECKOUT + ASK + COIN ORDER EMAILS + ITEM DETAILS + SMTP DEBUG) 🔥🔥")

import os
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from flask import Flask, request, jsonify
from flask_cors import CORS

# -------------------------------------------------
# Optional deps (Stripe, dotenv, OpenAI)
# -------------------------------------------------

try:
    import stripe
except Exception:
    stripe = None

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None

try:
    from openai import OpenAI
except Exception:
    OpenAI = None

# -------------------------------------------------
# App setup
# -------------------------------------------------

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

print("🔥🔥 FLASK APP INITIALIZED (v5) 🔥🔥")

# -------------------------------------------------
# Load environment (prefers server/env/.env.server, else server/.env)
# -------------------------------------------------

try:
    base_dir = os.path.dirname(__file__)
    env_server = os.path.join(base_dir, "env", ".env.server")
    env_fallback = os.path.join(base_dir, ".env")

    if load_dotenv is None:
        print("[server] python-dotenv not installed; skipping env file load")
    else:
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
# Read environment variables
# -------------------------------------------------

# Stripe
STRIPE_SECRET_KEY = (os.getenv("STRIPE_SECRET_KEY") or "").strip()

# Supabase (for future use, coins / profiles, etc.)
SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").strip()
SUPABASE_ANON_KEY = (os.getenv("SUPABASE_ANON_KEY") or "").strip()
SUPABASE_SERVICE_ROLE_KEY = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()

# OpenAI
OPENAI_API_KEY = (os.getenv("OPENAI_API_KEY") or "").strip()
OPENAI_MODEL = (os.getenv("OPENAI_MODEL") or "gpt-4.1-mini").strip() or "gpt-4.1-mini"

# Admin / internal secret for debug/test routes
ADMIN_SUPER_SECRET_CODE = (os.getenv("ADMIN_SUPER_SECRET_CODE") or "").strip()

# SMTP / Gmail (for order + confirmation emails)
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))  # 465 for SSL, 587 for STARTTLS
SMTP_USER = (os.getenv("SMTP_USER") or "").strip()  # your Gmail address
SMTP_PASS = (os.getenv("SMTP_PASS") or "").strip()  # Gmail App Password
SHOP_OWNER_EMAIL = (os.getenv("SHOP_OWNER_EMAIL") or SMTP_USER or "").strip()

if SMTP_USER and SMTP_PASS:
    print(
        f"[server] SMTP configured: host={SMTP_HOST} port={SMTP_PORT} "
        f"user={SMTP_USER} owner={SHOP_OWNER_EMAIL}"
    )
else:
    print("[server] SMTP not fully configured (missing SMTP_USER / SMTP_PASS)")

# -------------------------------------------------
# Stripe setup
# -------------------------------------------------

if stripe and STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY
    print("[server] Stripe secret loaded: True")
else:
    print("[server] Stripe secret loaded: False")

# -------------------------------------------------
# OpenAI setup
# -------------------------------------------------

if OpenAI and OPENAI_API_KEY:
    openai_client = OpenAI(api_key=OPENAI_API_KEY)
    print("[server] OpenAI configured: True, model:", OPENAI_MODEL)
else:
    openai_client = None
    if not OpenAI:
        print("[server] OpenAI configured: False (openai library not installed)")
    elif not OPENAI_API_KEY:
        print("[server] OpenAI configured: False (missing OPENAI_API_KEY)")
    else:
        print("[server] OpenAI configured: False (unknown reason)")

# -------------------------------------------------
# Email helpers
# -------------------------------------------------


def send_email(to_address: str, subject: str, body_text: str, body_html: str | None = None):
    """
    Low-level helper: send a single email using SMTP_USER / SMTP_PASS.

    Uses implicit SSL when SMTP_PORT == 465, otherwise STARTTLS on given port.
    """
    print(
        f"[mail] send_email called: to={to_address!r} subject={subject!r} "
        f"host={SMTP_HOST} port={SMTP_PORT} user={SMTP_USER!r}"
    )

    if not to_address:
        print("[mail] no to_address provided; skipping send_email")
        return

    if not (SMTP_HOST and SMTP_USER and SMTP_PASS):
        print("[mail] SMTP not fully configured; skipping email send")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SMTP_USER
    msg["To"] = to_address

    msg.attach(MIMEText(body_text, "plain"))
    if body_html:
        msg.attach(MIMEText(body_html, "html"))

    context = ssl.create_default_context()

    try:
        if SMTP_PORT == 465:
            print("[mail] connecting via SMTP_SSL...")
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context) as server:
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(SMTP_USER, [to_address], msg.as_string())
        else:
            print("[mail] connecting via SMTP + STARTTLS...")
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls(context=context)
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(SMTP_USER, [to_address], msg.as_string())
        print("[mail] email sent OK")
    except Exception as e:
        # Print full exception so we can see Gmail's exact error
        print("[mail] error sending email:", repr(e))


def send_coin_order_emails(
    user_email: str | None,
    coins_amount: int,
    stripe_session_id: str | None = None,
    user_display_name: str | None = None,
    *,
    item_title: str | None = None,
    item_size: str | None = None,
    item_sku: str | None = None,
    item_category: str | None = None,
):
    """
    Sends:
      - notification to shop owner
      - confirmation to the user (if user_email present)

    If item_title / item_size / item_sku / item_category are provided,
    they will also be listed in both emails.
    """
    print(
        "[mail] send_coin_order_emails called with: "
        f"user_email={user_email!r} coins={coins_amount} "
        f"item_title={item_title!r} item_size={item_size!r} "
        f"item_sku={item_sku!r} item_category={item_category!r}"
    )

    # Build a small item details block, used in both emails if present.
    item_lines = []
    if item_title:
        item_lines.append(f"Item: {item_title}")
    if item_sku:
        item_lines.append(f"SKU: {item_sku}")
    if item_size:
        item_lines.append(f"Size: {item_size}")
    if item_category:
        item_lines.append(f"Category: {item_category}")

    item_block = ""
    if item_lines:
        item_block = "\n" + "\n".join(item_lines) + "\n"

    # Email to owner
    if SHOP_OWNER_EMAIL:
        owner_subject = f"Nova Tutoring – Coin order: {item_title or 'Unknown item'}"
        owner_body = (
            "A coin-based order has been placed.\n\n"
            f"User: {user_display_name or user_email or 'unknown'}\n"
            f"Email: {user_email or 'unknown'}\n"
            f"Coins: {coins_amount}\n"
        )

        if stripe_session_id:
            owner_body += f"Stripe session: {stripe_session_id}\n"

        if item_block:
            owner_body += item_block

        print("[mail] sending OWNER coin order email...")
        send_email(SHOP_OWNER_EMAIL, owner_subject, owner_body)
    else:
        print("[mail] SHOP_OWNER_EMAIL not set; owner will NOT receive order emails.")

    # Email to user
    if user_email:
        user_subject = f"Nova Tutoring – Your coin order: {item_title or 'Unknown item'}"
        user_body = (
            f"Hi {user_display_name or 'there'},\n\n"
            f"Thank you for your order paid with {coins_amount} Nova coins.\n"
        )

        if item_block:
            user_body += "\nHere are your item details:\n" + item_block + "\n"

        user_body += (
            "If you did not make this purchase, please contact support.\n"
        )

        print("[mail] sending USER coin order email...")
        send_email(user_email, user_subject, user_body)
    else:
        print("[mail] no user_email for coin order; only owner was notified (if configured).")


# -------------------------------------------------
# Health
# -------------------------------------------------


@app.get("/health")
def health():
    return jsonify(
        ok=True,
        service="nova-backend",
        status="up",
        stripe=bool(stripe and STRIPE_SECRET_KEY),
        openai=bool(openai_client),
        smtp=bool(SMTP_USER and SMTP_PASS),
    )


# -------------------------------------------------
# Checkout core (card / Stripe)
# -------------------------------------------------


def _checkout_logic():
    print("🔥🔥 CHECKOUT SESSION LOGIC HIT 🔥🔥")

    body = request.get_json(silent=True) or {}

    sku = body.get("sku")
    title = body.get("title") or sku
    amount = body.get("amount")  # cents
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
# Ask core (OpenAI)
# -------------------------------------------------


def _ask_logic():
    if not openai_client:
        return jsonify(ok=False, error="OpenAI not configured on server"), 500

    body = request.get_json(silent=True) or {}
    question = (
        (body.get("question") or "")
        or (body.get("prompt") or "")
        or (body.get("q") or "")
    )
    question = str(question).strip()

    print("[server] /ask body:", body)

    if not question:
        return jsonify(ok=False, error="missing question"), 400

    try:
        completion = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are Nova, a kind, encouraging tutor for the Nova Tutoring app. "
                        "Explain things clearly, step by step, and keep answers concise but helpful. "
                        "Focus on teaching and encouragement."
                    ),
                },
                {
                    "role": "user",
                    "content": question,
                },
            ],
        )

        choice = completion.choices[0]
        answer = (choice.message.content or "").strip()

        return jsonify(
            ok=True,
            answer=answer,
            model=OPENAI_MODEL,
        )

    except Exception as e:
        print("[server] OpenAI error:", e)
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


@app.post("/ask")
def ask():
    return _ask_logic()


@app.post("/api/ask")
def ask_api():
    return _ask_logic()


# ---------------------- Coin order email endpoint --------------------------


@app.post("/api/coin-order")
def api_coin_order():
    """
    Called by the app when a coin-based order is completed.

    Expected JSON body (examples):

    1) Pure coin top-up:
    {
      "coins": 6000,
      "sessionId": "cs_test_123",
      "user": {
        "id": "...",
        "displayName": "Sven",
        "username": "Sven",
        "contactEmail": "sven@example.com",
        "email": "sven@example.com"
      }
    }

    2) Physical item paid with coins:
    {
      "coins": 6000,
      "item": {
        "id": "plushie_nova_pajamas",
        "title": "Nova Plushie (Pajamas)",
        "size": "L",
        "category": "plushies"
      },
      "user": {
        "id": "...",
        "displayName": "Sven",
        "username": "Sven",
        "contactEmail": "sven@example.com",
        "email": "sven@example.com"
      }
    }

    Also supports flat fields itemTitle / itemSize / sku / category.
    """
    data = request.get_json(silent=True) or {}
    print("[coin-order] incoming:", data)

    coins = int(data.get("coins") or 0)
    if coins <= 0:
        return jsonify(ok=False, error="invalid coins"), 400

    user = data.get("user") or {}
    user_email = (
        user.get("contactEmail")
        or user.get("email")
        or data.get("contactEmail")
        or data.get("email")
    )
    display_name = (
        user.get("displayName")
        or user.get("username")
        or user.get("name")
        or None
    )
    session_id = data.get("sessionId") or data.get("stripeSessionId")

    # Item details (either nested under "item" or flat on the body)
    item = data.get("item") or {}

    item_title = (
        item.get("title")
        or data.get("itemTitle")
        or data.get("title")
        or None
    )
    item_size = (
        item.get("size")
        or data.get("itemSize")
        or data.get("size")
        or None
    )
    item_sku = (
        item.get("id")
        or item.get("sku")
        or data.get("sku")
        or None
    )
    item_category = (
        item.get("category")
        or data.get("category")
        or None
    )

    # Here is where you'd also update Supabase / DB to record the order
    # and the user's new coin balance. For now, we just log + send emails.
    print(
        "[coin-order] coins={coins} user_email={email!r} "
        "display_name={name!r} session={sid!r} item_title={title!r} "
        "item_size={size!r} item_sku={sku!r} item_category={cat!r}".format(
            coins=coins,
            email=user_email,
            name=display_name,
            sid=session_id,
            title=item_title,
            size=item_size,
            sku=item_sku,
            cat=item_category,
        )
    )

    # Send owner + user emails, including item details if present
    send_coin_order_emails(
        user_email=user_email,
        coins_amount=coins,
        stripe_session_id=session_id,
        user_display_name=display_name,
        item_title=item_title,
        item_size=item_size,
        item_sku=item_sku,
        item_category=item_category,
    )

    return jsonify(ok=True)


# -------------------------------------------------
# Debug route – send a test email to the shop owner
# -------------------------------------------------


@app.post("/debug/send-test-email")
def debug_send_test_email():
    """
    Simple debug endpoint to verify SMTP from Render.

    Call with JSON: { "code": "YOUR_ADMIN_SUPER_SECRET_CODE" }

    It will send a single test email to SHOP_OWNER_EMAIL.
    """
    body = request.get_json(silent=True) or {}
    code = body.get("code") or ""

    if not ADMIN_SUPER_SECRET_CODE:
        return jsonify(ok=False, error="ADMIN_SUPER_SECRET_CODE not set"), 403

    if code != ADMIN_SUPER_SECRET_CODE:
        return jsonify(ok=False, error="invalid code"), 403

    if not SHOP_OWNER_EMAIL:
        return jsonify(ok=False, error="SHOP_OWNER_EMAIL not configured"), 400

    print("[debug] debug_send_test_email triggered")
    send_email(
        SHOP_OWNER_EMAIL,
        "Nova Tutoring – SMTP test from Render",
        "If you see this, SMTP from Render is working!",
    )
    return jsonify(ok=True)


# -------------------------------------------------
# Entrypoint
# -------------------------------------------------

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8787"))
    print(f"🔥🔥 STARTING SERVER v5 ON http://127.0.0.1:{port} 🔥🔥")
    app.run(host="0.0.0.0", port=port, debug=False)
