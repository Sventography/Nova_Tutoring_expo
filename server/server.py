# 🔥🔥 RUNNING FIXED SERVER VERSION v6-HTTP-RESENDONLY
# (CHECKOUT + ASK MEMORY + COIN ORDER EMAILS via RESEND HTTP ONLY) 🔥🔥
print(
  "🔥🔥 RUNNING FIXED SERVER VERSION v6-HTTP-RESENDONLY "
  "(CHECKOUT + ASK MEMORY + COIN ORDER EMAILS via RESEND HTTP ONLY) 🔥🔥"
)

import os

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests  # used for Supabase REST + Resend HTTP

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

print("🔥🔥 FLASK APP INITIALIZED (v6-HTTP-RESENDONLY) 🔥🔥")

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

# Supabase
SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").strip().rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()

# OpenAI
OPENAI_API_KEY = (os.getenv("OPENAI_API_KEY") or "").strip()
OPENAI_MODEL = (os.getenv("OPENAI_MODEL") or "gpt-4.1-mini").strip() or "gpt-4.1-mini"

# Admin / internal secret for debug/test routes
ADMIN_SUPER_SECRET_CODE = (os.getenv("ADMIN_SUPER_SECRET_CODE") or "").strip()

# Resend (HTTP email API)
RESEND_API_KEY = (os.getenv("RESEND_API_KEY") or "").strip()
RESEND_FROM_EMAIL = (
  (os.getenv("RESEND_FROM_EMAIL") or "").strip()
  or (os.getenv("SHOP_OWNER_EMAIL") or "").strip()
)

if RESEND_API_KEY:
  print(f"[server] Resend configured: True, from={RESEND_FROM_EMAIL!r}")
else:
  print("[server] Resend configured: False (missing RESEND_API_KEY)")

# SHOP_OWNER_EMAIL for owner notifications
SHOP_OWNER_EMAIL = (os.getenv("SHOP_OWNER_EMAIL") or RESEND_FROM_EMAIL or "").strip()
if SHOP_OWNER_EMAIL:
  print(f"[server] SHOP_OWNER_EMAIL set to: {SHOP_OWNER_EMAIL!r}")
else:
  print("[server] SHOP_OWNER_EMAIL not set; owner notifications will be skipped.")

if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
  print("[server] Supabase REST configured (URL + service key present)")
else:
  print("[server] Supabase REST NOT fully configured")

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
# Supabase REST helpers
# -------------------------------------------------

def supabase_headers(extra: dict | None = None):
  if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY):
    return None
  base = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
  }
  if extra:
    base.update(extra)
  return base


def supabase_rest_url(table: str) -> str:
  return f"{SUPABASE_URL}/rest/v1/{table}"


# -------------------------------------------------
# Purchases table helper (record each coin order)
# -------------------------------------------------

def record_purchase_row(
  user_id: str | None,
  coins: int,
  item_sku: str | None = None,
  item_title: str | None = None,
  item_size: str | None = None,
  item_category: str | None = None,
):
  """
  Inserts a row into public.purchases via Supabase REST.
  Safe to call even if Supabase REST isn't configured.
  """
  if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY):
    print("[coin-order] Supabase REST not configured; skipping purchases row")
    return

  url = supabase_rest_url("purchases")
  headers = supabase_headers(
    {"Content-Type": "application/json", "Prefer": "return=minimal"}
  )

  payload = {
    "user_id": user_id,
    "coins": coins,
    "sku": item_sku,
    "item_title": item_title,
    "item_size": item_size,
    "item_category": item_category,
  }

  try:
    print("[coin-order] inserting purchases row:", payload)
    resp = requests.post(url, headers=headers, json=payload, timeout=10)
    if resp.status_code >= 400:
      print("[coin-order] purchases insert error:", resp.status_code, resp.text)
    else:
      print("[coin-order] purchases row inserted OK")
  except Exception as e:
    print("[coin-order] purchases insert exception:", repr(e))

# -------------------------------------------------
# Email helpers (Resend HTTP ONLY, no SMTP)
# -------------------------------------------------

def send_email(to_address: str, subject: str, body_text: str, body_html: str | None = None):
  """
  Send an email via Resend HTTP API.
  This version does NOT attempt SMTP at all (Render blocks SMTP ports).
  """
  print(
    f"[mail] send_email called: to={to_address!r} subject={subject!r} "
    f"use_resend={bool(RESEND_API_KEY and RESEND_FROM_EMAIL)}"
  )

  if not to_address:
    raise Exception("No to_address provided for send_email")

  if not RESEND_API_KEY:
    raise Exception("Resend not configured (missing RESEND_API_KEY)")
  if not RESEND_FROM_EMAIL:
    raise Exception("Resend not configured (missing RESEND_FROM_EMAIL / SHOP_OWNER_EMAIL)")

  payload = {
    "from": RESEND_FROM_EMAIL,
    "to": [to_address],
    "subject": subject or "",
    "text": body_text or "",
  }
  if body_html:
    payload["html"] = body_html

  try:
    print("[mail] sending via Resend HTTP API ...")
    resp = requests.post(
      "https://api.resend.com/emails",
      headers={
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json",
      },
      json=payload,
      timeout=10,
    )
    if resp.status_code >= 400:
      print("[mail] Resend error:", resp.status_code, resp.text)
      raise Exception(f"Resend error {resp.status_code}: {resp.text}")
    print("[mail] email sent OK via Resend")
  except Exception as e:
    print("[mail] Resend exception:", repr(e))
    raise


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
  via Resend HTTP.
  """
  print(
    "[mail] send_coin_order_emails called with: "
    f"user_email={user_email!r} coins={coins_amount} "
    f"item_title={item_title!r} item_size={item_size!r} "
    f"item_sku={item_sku!r} item_category={item_category!r}"
  )

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

  # Owner email
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

    print("[mail] sending OWNER coin order email (Resend)...")
    send_email(SHOP_OWNER_EMAIL, owner_subject, owner_body)
  else:
    print("[mail] SHOP_OWNER_EMAIL not set; owner will NOT receive order emails.")

  # User email
  if user_email:
    user_subject = f"Nova Tutoring – Your coin order: {item_title or 'Unknown item'}"
    user_body = (
      f"Hi {user_display_name or 'there'},\n\n"
      f"Thank you for your order paid with {coins_amount} Nova coins.\n"
    )

    if item_block:
      user_body += "\nHere are your item details:\n" + item_block + "\n"

    user_body += "If you did not make this purchase, please contact support.\n"

    print("[mail] sending USER coin order email (Resend)...")
    send_email(user_email, user_subject, user_body)
  else:
    print("[mail] no user_email for coin order; only owner was notified (if configured).")

# -------------------------------------------------
# Supabase REST for Ask Memory
# -------------------------------------------------

def fetch_profile_memory_settings(user_id: str):
  """
  Returns (memory_limit, personality) for this user_id, or (0, 'encouraging') if anything fails.
  """
  if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and user_id):
    return 0, "encouraging"

  url = supabase_rest_url("profiles")
  params = {
    "id": f"eq.{user_id}",
    "select": "ask_memory_limit,ask_personality",
    "limit": 1,
  }
  headers = supabase_headers()

  try:
    resp = requests.get(url, headers=headers, params=params, timeout=10)
    if resp.status_code >= 400:
      print("[ask] profile fetch error:", resp.status_code, resp.text)
      return 0, "encouraging"

    rows = resp.json()
    if not rows:
      return 0, "encouraging"

    row = rows[0]
    memory_limit = row.get("ask_memory_limit") or 0
    personality = row.get("ask_personality") or "encouraging"
    return memory_limit, personality
  except Exception as e:
    print("[ask] profile fetch exception:", e)
    return 0, "encouraging"


def fetch_memory_messages(user_id: int, memory_limit: int):
  """
  Returns list of { role, content } messages for this user_id.
  """
  if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and user_id and memory_limit > 0):
    return []

  url = supabase_rest_url("ask_messages")
  params = {
    "user_id": f"eq.{user_id}",
    "select": "role,content",
    "order": "created_at.asc",
    "limit": memory_limit,
  }
  headers = supabase_headers()

  try:
    resp = requests.get(url, headers=headers, params=params, timeout=10)
    if resp.status_code >= 400:
      print("[ask] memory fetch error:", resp.status_code, resp.text)
      return []

    rows = resp.json()
    print(f"[ask] fetched {len(rows)} memory messages")
    return rows
  except Exception as e:
    print("[ask] memory fetch exception:", e)
    return []


def insert_memory_messages(user_id: str, question: str, answer: str):
  """
  Inserts the latest user + assistant messages.
  """
  if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and user_id):
    return

  url = supabase_rest_url("ask_messages")
  headers = supabase_headers({"Content-Type": "application/json", "Prefer": "return=minimal"})
  payload = [
    {"user_id": user_id, "role": "user", "content": question},
    {"user_id": user_id, "role": "assistant", "content": answer},
  ]

  try:
    resp = requests.post(url, headers=headers, json=payload, timeout=10)
    if resp.status_code >= 400:
      print("[ask] insert memory error:", resp.status_code, resp.text)
    else:
      print("[ask] inserted memory messages ok")
  except Exception as e:
    print("[ask] insert memory exception:", e)


def trim_memory_non_pinned(user_id: str, memory_limit: int):
  """
  Trims non-pinned messages if there are more than memory_limit.
  Here we treat memory_limit as the cap for NON-pinned messages (pinned can accumulate).
  """
  if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and user_id and memory_limit > 0):
    return

  url = supabase_rest_url("ask_messages")
  headers = supabase_headers()

  # Fetch ALL non-pinned IDs ordered oldest-first
  params = {
    "user_id": f"eq.{user_id}",
    "pinned": "eq.false",
    "select": "id",
    "order": "created_at.asc",
  }

  try:
    resp = requests.get(url, headers=headers, params=params, timeout=10)
    if resp.status_code >= 400:
      print("[ask] trim fetch error:", resp.status_code, resp.text)
      return

    rows = resp.json()
    ids = [row["id"] for row in rows if "id" in row]
    if len(ids) <= memory_limit:
      return

    overflow = len(ids) - memory_limit
    ids_to_delete = ids[:overflow]
    if not ids_to_delete:
      return

    # Supabase REST "in" filter: id=in.(uuid1,uuid2,...)
    in_clause = ",".join(ids_to_delete)
    delete_params = {
      "user_id": f"eq.{user_id}",
      "pinned": "eq.false",
      "id": f"in.({in_clause})",
    }

    del_resp = requests.delete(url, headers=headers, params=delete_params, timeout=10)
    if del_resp.status_code >= 400:
      print("[ask] trim delete error:", del_resp.status_code, del_resp.text)
    else:
      print(f"[ask] trimmed {len(ids_to_delete)} non-pinned memory messages")
  except Exception as e:
    print("[ask] trim exception:", e)

# -------------------------------------------------
# Health
# -------------------------------------------------

@app.get("/health")
def health():
  supabase_ok = bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)
  return jsonify(
    ok=True,
    service="nova-backend",
    status="up",
    stripe=bool(stripe and STRIPE_SECRET_KEY),
    openai=bool(openai_client),
    smtp=False,  # SMTP is not used on Render
    supabase=supabase_ok,
    resend=bool(RESEND_API_KEY),
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
# Ask core (OpenAI + Supabase-backed memory via HTTP)
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
  user_id = body.get("user_id")  # Supabase auth user id (string UUID)

  print("[server] /ask body:", body)

  if not question:
    return jsonify(ok=False, error="missing question"), 400

  # Defaults if no profile or Supabase
  memory_limit = 0
  personality = "encouraging"
  memory_messages: list[dict] = []

  # Fetch profile + memory if possible
  if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and user_id:
    memory_limit, personality = fetch_profile_memory_settings(user_id)
    if memory_limit > 0:
      memory_messages = fetch_memory_messages(user_id, memory_limit)

  # Build messages for OpenAI
  system_prompt = (
    f"You are Nova, a kind, encouraging tutor for the Nova Tutoring app.\n"
    f"Tone: {personality}.\n"
    "Explain things clearly, step by step, and keep answers concise but helpful. "
    "Focus on teaching and encouragement."
  )

  messages = [{"role": "system", "content": system_prompt}]

  for m in memory_messages:
    role = m.get("role") or "user"
    content = m.get("content") or ""
    if content:
      messages.append({"role": role, "content": content})

  messages.append({"role": "user", "content": question})

  try:
    completion = openai_client.chat.completions.create(
      model=OPENAI_MODEL,
      messages=messages,
    )

    choice = completion.choices[0]
    answer = (choice.message.content or "").strip()

    # Store memory + trim
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and user_id and memory_limit > 0:
      insert_memory_messages(user_id, question, answer)
      trim_memory_non_pinned(user_id, memory_limit)

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

  # optional user_id, if frontend sends it
  user_id = data.get("user_id") or user.get("id") or None

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

  try:
    # 1) Send emails (owner + user)
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

    # 2) Record row in purchases table
    record_purchase_row(
      user_id=user_id,
      coins=coins,
      item_sku=item_sku,
      item_title=item_title,
      item_size=item_size,
      item_category=item_category,
    )

    return jsonify(ok=True)
  except Exception as e:
    print("[coin-order] error sending emails or recording purchase:", repr(e))
    return jsonify(ok=False, error=str(e)), 500

# -------------------------------------------------
# Debug route – send a test email to the shop owner
# -------------------------------------------------

@app.post("/debug/send-test-email")
def debug_send_test_email():
  """
  Simple debug endpoint to verify email sending from Render via Resend HTTP.
  """
  body = request.get_json(silent=True) or {}
  code = body.get("code") or ""

  if not ADMIN_SUPER_SECRET_CODE:
    return jsonify(ok=False, error="ADMIN_SUPER_SECRET_CODE not set"), 403

  if code != ADMIN_SUPER_SECRET_CODE:
    return jsonify(ok=False, error="invalid code"), 403

  if not (SHOP_OWNER_EMAIL or RESEND_FROM_EMAIL):
    return jsonify(ok=False, error="No target email configured"), 400

  target = SHOP_OWNER_EMAIL or RESEND_FROM_EMAIL

  print("[debug] debug_send_test_email triggered → target:", target)

  try:
    send_email(
      target,
      "Nova Tutoring – Test email from Render (Resend HTTP)",
      "If you see this, email from Render via Resend HTTP is working!",
    )
    return jsonify(ok=True)
  except Exception as e:
    print("[debug] error in debug_send_test_email:", repr(e))
    return jsonify(ok=False, error=str(e)), 500

# -------------------------------------------------
# Entrypoint
# -------------------------------------------------

if __name__ == "__main__":
  port = int(os.getenv("PORT", "8787"))
  print(f"🔥🔥 STARTING SERVER v6-HTTP-RESENDONLY ON http://127.0.0.1:{port} 🔥🔥")
  app.run(host="0.0.0.0", port=port, debug=False)
