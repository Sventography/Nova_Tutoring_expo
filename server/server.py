# 🔥🔥 RUNNING FIXED SERVER VERSION v11-ASK-MEMORY-PERSONALITY
# (CHECKOUT + ASK MEMORY + COIN ORDER EMAILS via RESEND HTTP ONLY) 🔥🔥
print(
  "🔥🔥 RUNNING FIXED SERVER VERSION v11-ASK-MEMORY-PERSONALITY "
  "(CHECKOUT + ASK MEMORY + COIN ORDER EMAILS via RESEND HTTP ONLY) 🔥🔥"
)

import os
import json  # used for raw payload pretty-print in owner emails
import re    # used for simple coin-pack detection + helpers

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

print("🔥🔥 FLASK APP INITIALIZED (v11-ASK-MEMORY-PERSONALITY) 🔥🔥")

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
_raw_supabase_url = (
  os.getenv("SUPABASE_URL")
  or os.getenv("PUBLIC_SUPABASE_URL")
  or os.getenv("EXPO_PUBLIC_SUPABASE_URL")
  or ""
)
SUPABASE_URL = _raw_supabase_url.strip().rstrip("/")

SUPABASE_SERVICE_ROLE_KEY = (
  os.getenv("SUPABASE_SERVICE_ROLE_KEY")
  or os.getenv("SUPABASE_SERVICE_KEY")
  or os.getenv("SERVICE_ROLE_KEY")
  or ""
).strip()

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

# SHOP_OWNER_EMAIL for owner notifications
SHOP_OWNER_EMAIL = (os.getenv("SHOP_OWNER_EMAIL") or RESEND_FROM_EMAIL or "").strip()

# Optional logo URL for emails (served via Flask static, e.g. /static/nova-email-logo.png)
EMAIL_LOGO_URL = (os.getenv("EMAIL_LOGO_URL") or "").strip()

# ---- Debug prints so you can see what the process actually sees ----
print("[debug] SUPABASE_URL present:", bool(SUPABASE_URL))
print("[debug] SUPABASE_SERVICE_ROLE_KEY length:", len(SUPABASE_SERVICE_ROLE_KEY))
print("[debug] RESEND_API_KEY present:", bool(RESEND_API_KEY))
print("[debug] RESEND_FROM_EMAIL:", repr(RESEND_FROM_EMAIL))
print("[debug] SHOP_OWNER_EMAIL:", repr(SHOP_OWNER_EMAIL))
print("[debug] EMAIL_LOGO_URL:", repr(EMAIL_LOGO_URL))

if RESEND_API_KEY:
  print(f"[server] Resend configured: True, from={RESEND_FROM_EMAIL!r}")
else:
  print("[server] Resend configured: False (missing RESEND_API_KEY)")

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

# Map SKUs to Stripe Product IDs for legendary companions
SKU_TO_PRODUCT_ID: dict[str, str] = {
  # Legendary companions – these use existing Stripe Products
  "companion:mecha_owl":      "prod_U0c6OkAwebm80d",
  "companion:chrono_fox":     "prod_U0c0zLPdtVZuUG",
  "companion:celestra":       "prod_U0bzgsK8mCGCAa",
  "companion:axolotl_oracle": "prod_U0bxgNFYPhkOcW",
  "companion:astral_nova":    "prod_U0bvNvwU8u7hCG",
  "companion:aetherwyrm":     "prod_U0btlQ9ZuFnH5F",
}

# -------------------------------------------------
# Ask monetization config (memory tiers + personalities)
# -------------------------------------------------

# Gold-standard free memory: keeps a tiny window even with no paid tier
ASK_FREE_MEMORY_LIMIT = 5

# Memory tiers by SKU → memory_limit
# (matching your assets: nova_notes, nova_journal, nova_vault, nova_galaxy_archive)
ASK_MEMORY_TIERS: dict[str, int] = {
  "ask_memory_tier1": 20,   # Nova Notes
  "ask_memory_tier2": 50,   # Nova Journal
  "ask_memory_tier3": 100,  # Nova Vault
  "ask_memory_tier4": 250,  # Nova Galaxy Archive
}

# Personalities unlocked by owning these SKUs
# Values here are *internal codes* that we map to human tone text later.
ASK_PERSONALITY_SKU_MAP: dict[str, str] = {
  "ask_personality_calm_focus":  "calm_focus",
  "ask_personality_coach":       "coach",
  "ask_personality_playful":     "playful",
  "ask_personality_storyteller": "storyteller",
}

# The free baseline personality everyone gets
ASK_PERSONALITY_FREE = "encouraging"

# -------------------------------------------------
# Small helpers
# -------------------------------------------------

def norm(v):
  """
  Normalize string-ish values:
  - convert numbers to str
  - strip whitespace
  - return None if empty/whitespace
  """
  if v is None:
    return None
  if isinstance(v, (int, float)):
    return str(v)
  s = str(v).strip()
  return s or None

def pick(*vals):
  """
  Return the first non-empty value (after norm).
  If everything is empty/None, returns None.
  """
  for v in vals:
    nv = norm(v)
    if nv is not None:
      return nv
  return None

def dig(d, *path):
  """
  Safely dig nested dict keys, e.g. dig(obj, "shipping", "address", "line1").
  """
  cur = d
  for key in path:
    if not isinstance(cur, dict):
      return None
    cur = cur.get(key)
  return cur

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
  stripe_session_id: str | None = None,
  *,
  shipping_name: str | None = None,
  shipping_phone: str | None = None,
  shipping_address1: str | None = None,
  shipping_address2: str | None = None,
  shipping_city: str | None = None,
  shipping_state: str | None = None,
  shipping_postal_code: str | None = None,
  shipping_country: str | None = None,
  shipping_notes: str | None = None,
):
  """
  Inserts a row into public.purchases via Supabase REST.

  Supabase table columns (you'll want all of these present):
    - user_id (uuid)
    - coins_spent (int4)
    - stripe_session_id (text)
    - meta (jsonb)  -- { sku?, title?, size?, category?, shipping? }
    - bought_at (timestamptz, default now())
    - shipping_name (text)
    - shipping_phone (text)
    - shipping_address1 (text)
    - shipping_address2 (text)
    - shipping_city (text)
    - shipping_state (text)
    - shipping_postal_code (text)
    - shipping_country (text)
    - shipping_notes (text)
  """
  if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY):
    print("[coin-order] Supabase REST not configured; skipping purchases row")
    return

  url = supabase_rest_url("purchases")
  # return=representation so we see what actually got written
  headers = supabase_headers(
    {"Content-Type": "application/json", "Prefer": "return=representation"}
  )

  # Build meta JSON from item + shipping info
  meta: dict = {}

  if item_sku:
    meta["sku"] = item_sku
  if item_title:
    meta["title"] = item_title
  if item_size:
    meta["size"] = item_size
  if item_category:
    meta["category"] = item_category

  # Optional nested shipping blob for debugging / redundancy
  shipping_meta: dict = {}
  if shipping_name:
    shipping_meta["name"] = shipping_name
  if shipping_phone:
    shipping_meta["phone"] = shipping_phone
  if shipping_address1:
    shipping_meta["address1"] = shipping_address1
  if shipping_address2:
    shipping_meta["address2"] = shipping_address2
  if shipping_city:
    shipping_meta["city"] = shipping_city
  if shipping_state:
    shipping_meta["state"] = shipping_state
  if shipping_postal_code:
    shipping_meta["postal_code"] = shipping_postal_code
  if shipping_country:
    shipping_meta["country"] = shipping_country
  if shipping_notes:
    shipping_meta["notes"] = shipping_notes

  if shipping_meta:
    meta["shipping"] = shipping_meta

  payload: dict = {
    "user_id": user_id,
    "coins_spent": coins,
    # bought_at will use DEFAULT now() in the DB
  }

  if stripe_session_id:
    payload["stripe_session_id"] = stripe_session_id

  if meta:
    payload["meta"] = meta

  # Also store shipping in dedicated columns for easy reading.
  if shipping_name is not None:
    payload["shipping_name"] = shipping_name
  if shipping_phone is not None:
    payload["shipping_phone"] = shipping_phone
  if shipping_address1 is not None:
    payload["shipping_address1"] = shipping_address1
  if shipping_address2 is not None:
    payload["shipping_address2"] = shipping_address2
  if shipping_city is not None:
    payload["shipping_city"] = shipping_city
  if shipping_state is not None:
    payload["shipping_state"] = shipping_state
  if shipping_postal_code is not None:
    payload["shipping_postal_code"] = shipping_postal_code
  if shipping_country is not None:
    payload["shipping_country"] = shipping_country
  if shipping_notes is not None:
    payload["shipping_notes"] = shipping_notes

  try:
    print("[coin-order] inserting purchases row to", url)
    print("[coin-order] payload:", payload)
    resp = requests.post(url, headers=headers, json=payload, timeout=10)
    print("[coin-order] insert status:", resp.status_code)
    print("[coin-order] insert body:", resp.text[:2000])
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

    print("[mail] Resend status_code:", resp.status_code)
    print("[mail] Resend response text:", repr(resp.text))

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
  shipping_name: str | None = None,
  shipping_phone: str | None = None,
  address1: str | None = None,
  address2: str | None = None,
  city: str | None = None,
  state: str | None = None,
  postal_code: str | None = None,
  country: str | None = None,
  extra_notes: str | None = None,
  raw_payload: dict | None = None,
):
  """
  Sends:
    - notification to shop owner (with full shipping + raw payload)
    - confirmation to the user (if user_email present)
  via Resend HTTP.
  """
  print(
    "[mail] send_coin_order_emails called with: "
    f"user_email={user_email!r} coins={coins_amount} "
    f"item_title={item_title!r} item_size={item_size!r} "
    f"item_sku={item_sku!r} item_category={item_category!r} "
    f"shipping_name={shipping_name!r} shipping_phone={shipping_phone!r}"
  )

  # Optional logo HTML header
  logo_html = ""
  if EMAIL_LOGO_URL:
    logo_html = (
      f'<div style="text-align:center;margin-bottom:16px;">'
      f'<img src="{EMAIL_LOGO_URL}" alt="Nova Tutoring" '
      f'style="max-width:220px;height:auto;display:inline-block;" />'
      f"</div>"
    )

  # ---------- Item block (text) ----------
  item_lines = []
  if item_title:
    item_lines.append(f"Item: {item_title}")
  if item_sku:
    item_lines.append(f"SKU: {item_sku}")
  if item_size:
    item_lines.append(f"Size: {item_size}")
  if item_category:
    item_lines.append(f"Category: {item_category}")

  item_block_text = ""
  if item_lines:
    item_block_text = "\n" + "\n".join(item_lines) + "\n"

  # ---------- Shipping block (text + HTML) ----------
  shipping_lines: list[str] = []

  if shipping_name:
    shipping_lines.append(f"Name: {shipping_name}")
  if shipping_phone:
    shipping_lines.append(f"Phone: {shipping_phone}")

  address_parts: list[str] = []
  if address1:
    address_parts.append(address1)
  if address2:
    address_parts.append(address2)

  city_line_parts: list[str] = []
  if city:
    city_line_parts.append(city)
  if state:
    if city_line_parts:
      city_line_parts[-1] = f"{city_line_parts[-1]}, {state}"
    else:
      city_line_parts.append(state)
  if postal_code:
    city_line_parts.append(postal_code)

  if address_parts:
    shipping_lines.append("Address:")
    for line in address_parts:
      shipping_lines.append(f"  {line}")

  if city_line_parts:
    shipping_lines.append("Location:")
    shipping_lines.append("  " + " ".join(city_line_parts))

  if country:
    shipping_lines.append(f"Country: {country}")

  if extra_notes:
    shipping_lines.append(f"Notes: {extra_notes}")

  shipping_block_text = ""
  if shipping_lines:
    shipping_block_text = "\nShipping Info:\n" + "\n".join(shipping_lines) + "\n"

  # HTML version of shipping info
  shipping_block_html = ""
  if shipping_name or shipping_phone or address1 or address2 or city or state or postal_code or country or extra_notes:
    shipping_block_html = "<h3 style='margin-top:16px;'>Shipping Info</h3><p style='line-height:1.5;font-size:14px;'>"
    if shipping_name:
      shipping_block_html += f"<strong>Name:</strong> {shipping_name}<br>"
    if shipping_phone:
      shipping_block_html += f"<strong>Phone:</strong> {shipping_phone}<br>"
    if address1:
      shipping_block_html += f"{address1}<br>"
    if address2:
      shipping_block_html += f"{address2}<br>"
    if city or state or postal_code:
      line = ""
      if city:
        line += city
      if state:
        line += (", " if line else "") + state
      if postal_code:
        line += " " + postal_code
      shipping_block_html += line + "<br>"
    if country:
      shipping_block_html += f"{country}<br>"
    if extra_notes:
      shipping_block_html += f"<strong>Notes:</strong> {extra_notes}<br>"
    shipping_block_html += "</p>"

  # ---------- OWNER email ----------
  if SHOP_OWNER_EMAIL:
    owner_subject = f"Nova Tutoring – Coin order: {item_title or 'Unknown item'}"
    owner_body_text = (
      "A coin-based order has been placed.\n\n"
      f"User: {user_display_name or user_email or 'unknown'}\n"
      f"Email: {user_email or 'unknown'}\n"
      f"Coins: {coins_amount}\n"
    )

    if stripe_session_id:
      owner_body_text += f"Stripe session: {stripe_session_id}\n"

    if item_block_text:
      owner_body_text += "\nItem Details:\n" + item_block_text

    if shipping_block_text:
      owner_body_text += shipping_block_text
    else:
      owner_body_text += "\nShipping Info: (not provided – may be digital or older form)\n"

    # Append raw payload so dev can see EVERYTHING the form sent
    if raw_payload is not None:
      try:
        pretty_json = json.dumps(raw_payload, indent=2, ensure_ascii=False, sort_keys=True)
      except Exception:
        pretty_json = str(raw_payload)
      owner_body_text += "\nRaw payload:\n" + pretty_json + "\n"

    owner_html = (
      "<html><body style='font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;"
      "font-size:14px;color:#222;background:#f7f7f7;padding:16px;'>"
      "<div style='max-width:520px;margin:0 auto;background:#ffffff;border-radius:8px;"
      "padding:16px;border:1px solid #e2e2e2;'>"
      f"{logo_html}"
      "<h2 style='margin-top:0;font-size:18px;'>New coin order received</h2>"
      "<p style='line-height:1.5;'>"
      f"<strong>User:</strong> {user_display_name or user_email or 'unknown'}<br>"
      f"<strong>Email:</strong> {user_email or 'unknown'}<br>"
      f"<strong>Coins:</strong> {coins_amount}<br>"
    )

    if stripe_session_id:
      owner_html += f"<strong>Stripe session:</strong> {stripe_session_id}<br>"

    owner_html += "</p>"

    if item_title or item_sku or item_size or item_category:
      owner_html += "<h3>Item Details</h3><p style='line-height:1.5;font-size:14px;'>"
      if item_title:
        owner_html += f"<strong>Item:</strong> {item_title}<br>"
      if item_sku:
        owner_html += f"<strong>SKU:</strong> {item_sku}<br>"
      if item_size:
        owner_html += f"<strong>Size:</strong> {item_size}<br>"
      if item_category:
        owner_html += f"<strong>Category:</strong> {item_category}<br>"
      owner_html += "</p>"

    if shipping_block_html:
      owner_html += shipping_block_html
    else:
      owner_html += "<p style='margin-top:16px;'>Shipping Info not provided (may be digital or older form).</p>"

    if raw_payload is not None:
      try:
        pretty_json_html = json.dumps(raw_payload, indent=2, ensure_ascii=False, sort_keys=True)
      except Exception:
        pretty_json_html = str(raw_payload)
      owner_html += (
        "<h3 style='margin-top:16px;'>Raw payload</h3>"
        "<pre style='font-size:11px;background:#f3f3f3;padding:8px;border-radius:4px;"
        "white-space:pre-wrap;word-wrap:break-word;'>"
        f"{pretty_json_html}"
        "</pre>"
      )

    owner_html += "</div></body></html>"

    print("[mail] sending OWNER coin order email (Resend)... to", SHOP_OWNER_EMAIL)
    send_email(SHOP_OWNER_EMAIL, owner_subject, owner_body_text, owner_html)
  else:
    print("[mail] SHOP_OWNER_EMAIL not set; owner will NOT receive order emails.")

  # ---------- USER email ----------
  if user_email:
    user_subject = f"Nova Tutoring – Your coin order: {item_title or 'Unknown item'}"
    user_body_text = (
      f"Hi {user_display_name or 'there'},\n\n"
      f"Thank you for your order paid with {coins_amount} Nova coins.\n"
    )

    if item_block_text:
      user_body_text += "\nHere are your item details:\n" + item_block_text + "\n"

    if shipping_block_text:
      user_body_text += shipping_block_text + "\n"

    user_body_text += "If you did not make this purchase, please contact support.\n"

    user_html = (
      "<html><body style='font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;"
      "font-size:14px;color:#222;background:#f7f7f7;padding:16px;'>"
      "<div style='max-width:520px;margin:0 auto;background:#ffffff;border-radius:8px;"
      "padding:16px;border:1px solid #e2e2e2;'>"
      f"{logo_html}"
      f"<h2 style='margin-top:0;font-size:18px;'>Thank you for your order, {user_display_name or 'there'}!</h2>"
      f"<p style='line-height:1.5;'>You paid with <strong>{coins_amount}</strong> Nova coins.</p>"
    )

    if item_title or item_sku or item_size or item_category:
      user_html += "<h3>Item Details</h3><p style='line-height:1.5;font-size:14px;'>"
      if item_title:
        user_html += f"<strong>Item:</strong> {item_title}<br>"
      if item_sku:
        user_html += f"<strong>SKU:</strong> {item_sku}<br>"
      if item_size:
        user_html += f"<strong>Size:</strong> {item_size}<br>"
      if item_category:
        user_html += f"<strong>Category:</strong> {item_category}<br>"
      user_html += "</p>"

    if shipping_block_html:
      user_html += shipping_block_html

    user_html += (
      "<p style='margin-top:16px;line-height:1.5;'>"
      "If you did not make this purchase, please contact support."
      "</p>"
      "</div></body></html>"
    )

    print("[mail] sending USER coin order email (Resend)... to", user_email)
    send_email(user_email, user_subject, user_body_text, user_html)
  else:
    print("[mail] no user_email for coin order; only owner was notified (if configured).")

# -------------------------------------------------
# Supabase REST for Ask Memory + Personalities
# -------------------------------------------------

def _extract_owned_from_purchases(purchases: object) -> dict:
  """
  Given the 'purchases' jsonb column (which might be shaped like
  { "owned": { "sku": true, ... }, "version": 1 } or in some other
  form), try to return a simple { sku: bool } dict.
  """
  if not isinstance(purchases, dict):
    return {}

  # Preferred schema: { owned: { "sku": true }, version: 1 }
  owned = purchases.get("owned")
  if isinstance(owned, dict):
    return owned

  # Fallback: maybe the whole object is already a flat { sku: bool }
  flat = {}
  for k, v in purchases.items():
    if isinstance(v, bool):
      flat[k] = v
  return flat


def fetch_profile_ask_settings(user_id: str):
  """
  Returns (memory_limit, memory_tier_code, personality_code) for this user_id.

  memory_limit is derived from *purchased* ask memory tiers:
    - tier4 (if owned) → 250
    - tier3 (if owned) → 100
    - tier2 (if owned) →  50
    - tier1 (if owned) →  20
    - otherwise        →   5  (free baseline)

  memory_tier_code is a short string used by the client:
    - "tier4", "tier3", "tier2", "tier1", or "free"

  personality_code is derived from:
    - row.ask_personality (string),
    - clamped to {encouraging} + any purchased personalities.
  """
  if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and user_id):
    print("[ask] fetch_profile_ask_settings skipped (missing config or user_id)")
    return ASK_FREE_MEMORY_LIMIT, "free", ASK_PERSONALITY_FREE

  url = supabase_rest_url("profiles")
  params = {
    "id": f"eq.{user_id}",
    "select": "ask_memory_limit,ask_memory_tier,ask_personality,purchases",
    "limit": 1,
  }
  headers = supabase_headers()

  try:
    resp = requests.get(url, headers=headers, params=params, timeout=10)
    if resp.status_code >= 400:
      print("[ask] profile fetch error:", resp.status_code, resp.text)
      return ASK_FREE_MEMORY_LIMIT, "free", ASK_PERSONALITY_FREE

    rows = resp.json()
    if not rows:
      print("[ask] profile fetch: no profile row for user", user_id)
      return ASK_FREE_MEMORY_LIMIT, "free", ASK_PERSONALITY_FREE

    row = rows[0]

    # --- owned SKUs from purchases jsonb ---
    purchases = row.get("purchases") or {}
    owned = _extract_owned_from_purchases(purchases)
    print(f"[ask] profile purchases owned keys for {user_id}:", list(owned.keys()))

    # --- memory_limit + memory_tier from SKUs (highest tier wins) ---
    memory_limit = ASK_FREE_MEMORY_LIMIT
    memory_tier_code = "free"
    memory_sku_used = None

    # Sort by limit descending so highest tier wins
    for sku, limit in sorted(
      ASK_MEMORY_TIERS.items(), key=lambda kv: kv[1], reverse=True
    ):
      if owned.get(sku):
        memory_limit = limit
        memory_sku_used = sku
        if sku == "ask_memory_tier4":
          memory_tier_code = "tier4"
        elif sku == "ask_memory_tier3":
          memory_tier_code = "tier3"
        elif sku == "ask_memory_tier2":
          memory_tier_code = "tier2"
        elif sku == "ask_memory_tier1":
          memory_tier_code = "tier1"
        break

    # Optionally respect legacy ask_memory_limit but never *lower* the limit
    legacy_limit = int(row.get("ask_memory_limit") or 0)
    legacy_tier = (row.get("ask_memory_tier") or "").strip() or None

    if legacy_limit > memory_limit:
      print(
        "[ask] legacy ask_memory_limit higher than purchased tiers; "
        "using legacy for now:",
        legacy_limit,
      )
      memory_limit = legacy_limit
      if legacy_tier:
        memory_tier_code = legacy_tier

    # --- personalities ---
    raw_personality = (row.get("ask_personality") or ASK_PERSONALITY_FREE).strip().lower()
    raw_personality = raw_personality.replace("-", "_")

    # Backwards-compatible alias map (older codes → new ones)
    personality_aliases = {
      "focused": "calm_focus",
      "focus": "calm_focus",
      "chill": "playful",       # old "chill" → playful/creative
      "hype_coach": "coach",
    }
    if raw_personality in personality_aliases:
      print(
        f"[ask] mapping legacy personality {raw_personality!r} "
        f"→ {personality_aliases[raw_personality]!r}"
      )
      raw_personality = personality_aliases[raw_personality]

    # Everyone always has at least the free baseline
    allowed_personalities = {ASK_PERSONALITY_FREE}

    # Add any purchased personalities based on SKUs
    for sku, code in ASK_PERSONALITY_SKU_MAP.items():
      if owned.get(sku):
        allowed_personalities.add(code)

    if raw_personality not in allowed_personalities:
      print(
        f"[ask] personality {raw_personality!r} not owned; "
        f"falling back to {ASK_PERSONALITY_FREE!r}"
      )
      personality_code = ASK_PERSONALITY_FREE
    else:
      personality_code = raw_personality

    print(
      f"[ask] profile ask settings for {user_id}: "
      f"memory_limit={memory_limit}, memory_tier={memory_tier_code!r}, "
      f"memory_sku={memory_sku_used!r}, personality={personality_code!r}, "
      f"allowed={allowed_personalities}"
    )
    return memory_limit, memory_tier_code, personality_code
  except Exception as e:
    print("[ask] profile fetch exception:", e)
    return ASK_FREE_MEMORY_LIMIT, "free", ASK_PERSONALITY_FREE


def fetch_memory_messages(user_id: str, memory_limit: int):
  """
  Returns list of { role, content } messages for this user_id.
  """
  if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and user_id and memory_limit > 0):
    print("[ask] fetch_memory_messages skipped (missing config or memory_limit <= 0)")
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
    print(f"[ask] fetched {len(rows)} memory messages for user {user_id}")
    return rows
  except Exception as e:
    print("[ask] memory fetch exception:", e)
    return []


def insert_memory_messages(user_id: str, question: str, answer: str):
  """
  Inserts the latest user + assistant messages.
  """
  if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and user_id):
    print("[ask] insert_memory_messages skipped (missing config or user_id)")
    return

  url = supabase_rest_url("ask_messages")
  headers = supabase_headers({"Content-Type": "application/json", "Prefer": "return=minimal"})
  payload = [
    {"user_id": user_id, "role": "user", "content": question},
    {"user_id": user_id, "role": "assistant", "content": answer},
  ]

  try:
    print("[ask] inserting memory messages for user", user_id)
    resp = requests.post(url, headers=headers, json=payload, timeout=10)
    if resp.status_code >= 400:
      print("[ask] insert memory error:", resp.status_code, resp.text)
    else:
      print("[ask] inserted memory messages ok")
  except Exception as e:
    print("[ask] insert_memory exception:", e)


def trim_memory_non_pinned(user_id: str, memory_limit: int):
  """
  Trims non-pinned messages if there are more than memory_limit.
  Here we treat memory_limit as the cap for NON-pinned messages (pinned can accumulate).
  """
  if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and user_id and memory_limit > 0):
    print("[ask] trim_memory_non_pinned skipped (missing config or user_id/memory_limit)")
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
    print(f"[ask] trim check: {len(ids)} non-pinned rows for user {user_id}, limit={memory_limit}")
    if len(ids) <= memory_limit:
      return

    overflow = len(ids) - memory_limit
    ids_to_delete = ids[:overflow]
    if not ids_to_delete:
      return

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
    shop_owner_email=bool(SHOP_OWNER_EMAIL),
    email_logo_url=bool(EMAIL_LOGO_URL),
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

  product_id = SKU_TO_PRODUCT_ID.get(str(sku))

  if product_id:
    price_data = {
      "currency": currency,
      "product": product_id,
      "unit_amount": int(amount),
    }
  else:
    price_data = {
      "currency": currency,
      "product_data": {
        "name": title,
      },
      "unit_amount": int(amount),
    }

  try:
    session = stripe.checkout.Session.create(
      mode="payment",
      payment_method_types=["card"],
      line_items=[
        {
          "price_data": price_data,
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

# Tone strings for personalities — keys must match personality codes used above
ASK_TONE_LABELS: dict[str, str] = {
  "encouraging":  "warm, encouraging, and gently motivational",
  "calm_focus":   "calm, focused, and very structured, helping the student stay in study mode",
  "coach":        "firm but kind coach energy, direct and motivating without being harsh",
  "playful":      "light, playful, and creative, using fun examples while still being clear",
  "storyteller":  "narrative and example-heavy, weaving short stories into explanations",
}

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
  history = body.get("history") or []  # optional client-side history fallback

  print("[server] /ask body:", body)

  if not question:
    return jsonify(ok=False, error="missing question"), 400

  memory_limit = 0
  memory_tier = "free"
  personality_code = ASK_PERSONALITY_FREE
  memory_messages: list[dict] = []

  if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and user_id:
    # New: returns (limit, tier_code, personality_code)
    memory_limit, memory_tier, personality_code = fetch_profile_ask_settings(user_id)
    if memory_limit > 0:
      memory_messages = fetch_memory_messages(user_id, memory_limit)

  # If no stored memory yet, we can fall back to a slice of client history.
  # We still clamp it to the tier's memory_limit or the free baseline.
  if not memory_messages and isinstance(history, list):
    max_items = memory_limit if (memory_limit and memory_limit > 0) else ASK_FREE_MEMORY_LIMIT
    tail = history[-max_items:]
    print(f"[ask] using {len(tail)} client-side history items as fallback")
  else:
    tail = []

  tone_text = ASK_TONE_LABELS.get(
    personality_code,
    ASK_TONE_LABELS[ASK_PERSONALITY_FREE],
  )

  system_prompt = (
    "You are Nova, a kind tutor for the Nova Tutoring app.\n"
    f"Tone: {tone_text}.\n"
    "Explain things clearly, step by step, and keep answers concise but helpful. "
    "Focus on teaching, clarity, and encouragement for students of all ages.\n"
    "Avoid making promises about grades or guarantees; focus on skills and understanding."
  )

  messages = [{"role": "system", "content": system_prompt}]

  for m in memory_messages:
    role = m.get("role") or "user"
    content = m.get("content") or ""
    if content:
      messages.append({"role": role, "content": content})

  if not memory_messages:
    for m in tail:
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

    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and user_id and memory_limit > 0:
      insert_memory_messages(user_id, question, answer)
      trim_memory_non_pinned(user_id, memory_limit)
    else:
      print("[ask] skipping memory insert/trim (no supabase config, user_id, or memory_limit)")

    # Return both legacy 'memory_limit' and new ask_memory_* fields
    return jsonify(
      ok=True,
      answer=answer,
      model=OPENAI_MODEL,
      personality=personality_code,
      memory_limit=memory_limit,       # legacy
      ask_memory_tier=memory_tier,     # "free" | "tier1" | "tier2" | "tier3" | "tier4"
      ask_memory_limit=memory_limit,   # numeric cap for non-pinned msgs
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

# -------------------------------------------------
# Fulfillment endpoint for Stripe redirects (/checkout/success)
# -------------------------------------------------

def _infer_coin_pack_from_sku(sku: str) -> int:
  """
  Very lightweight coin-pack detector:
  - If sku looks like it has digits in it, we grab the first integer and return it as 'coins'.
  - Example: 'coins_1000', 'coins:2500-pack' → 1000 / 2500
  - If nothing is parsable, returns 0.
  """
  if not sku:
    return 0
  s = str(sku).lower()
  if "coin" not in s:
    return 0
  nums = re.findall(r"\d+", s)
  if not nums:
    return 0
  try:
    return int(nums[0])
  except Exception:
    return 0


@app.post("/api/fulfill")
def api_fulfill():
  """
  Fulfillment endpoint called by the Expo /checkout/success screen.

  Expected body (current client):
    { "sku": "<sku>", "tx": "<stripe_session_id>" }

  Response shape expected by the client:
    - For coin packs:
        { ok: true, type: "coins", sku, tx, coins: <int> }
    - For ownable items (themes, cursors, plushies, etc.):
        { ok: true, type: "ownable", sku, tx }

  This endpoint does NOT manage entitlements directly. The front end
  (PurchasesContext + grant()) is the source of truth for ownership.
  """
  body = request.get_json(silent=True) or {}
  print("[fulfill] incoming body:", body)

  sku = body.get("sku")
  tx = body.get("tx") or body.get("session_id") or body.get("stripeSessionId")

  if not sku:
    return jsonify(ok=False, error="missing sku"), 400

  hinted_type = (
    body.get("type")
    or body.get("kind")
    or body.get("purchase_type")
    or ""
  ).strip().lower()

  coins = 0
  is_coin_pack = False

  if hinted_type == "coins":
    coins = int(body.get("coins") or 0)
    if coins <= 0:
      coins = _infer_coin_pack_from_sku(str(sku))
    is_coin_pack = coins > 0
  else:
    coins = _infer_coin_pack_from_sku(str(sku))
    is_coin_pack = coins > 0

  if is_coin_pack and coins > 0:
    print(f"[fulfill] treating sku={sku!r} as coin-pack with {coins} coins")
    return jsonify(
      ok=True,
      type="coins",
      sku=sku,
      tx=tx,
      coins=coins,
    )

  print(f"[fulfill] treating sku={sku!r} as ownable (non-coin) item")
  return jsonify(
    ok=True,
    type="ownable",
    sku=sku,
    tx=tx,
  )

# ---------------------- Coin order email + purchases endpoint --------------------------

@app.post("/api/coin-order")
def api_coin_order():
  data = request.get_json(silent=True) or {}
  print("[coin-order] incoming raw data:", data)

  coins = int(data.get("coins") or 0)
  if coins <= 0:
    return jsonify(ok=False, error="invalid coins"), 400

  user = data.get("user") or {}
  shipping = data.get("shipping") or {}

  # User + identity info
  user_email = pick(
    dig(user, "contactEmail"),
    dig(user, "email"),
    data.get("contactEmail"),
    data.get("email"),
  )
  display_name = pick(
    dig(user, "displayName"),
    dig(user, "username"),
    dig(user, "name"),
    data.get("displayName"),
    data.get("name"),
  )
  session_id = pick(
    data.get("sessionId"),
    data.get("stripeSessionId"),
  )
  user_id = pick(
    data.get("user_id"),
    dig(user, "id"),
  )

  # Item info
  item = data.get("item") or {}
  item_title = pick(
    item.get("title"),
    data.get("itemTitle"),
    data.get("title"),
  )
  item_size = pick(
    item.get("size"),
    data.get("itemSize"),
    data.get("size"),
  )
  item_sku = pick(
    item.get("id"),
    item.get("sku"),
    data.get("sku"),
  )
  item_category = pick(
    item.get("category"),
    data.get("category"),
  )

  # Shipping/contact info from scrollable form (and fallbacks)
  shipping_name = pick(
    data.get("shippingName"),
    data.get("name"),
    shipping.get("name"),
    shipping.get("fullName"),
    shipping.get("recipient"),
    display_name,
  )
  shipping_phone = pick(
    data.get("phone"),
    data.get("contactPhone"),
    data.get("shippingPhone"),
    data.get("shipping_phone"),
    shipping.get("phone"),
    shipping.get("contactPhone"),
    shipping.get("shippingPhone"),
    user.get("phone"),
  )

  address1 = pick(
    data.get("address1"),
    data.get("address_1"),
    data.get("shippingAddress1"),
    data.get("shipping_address1"),
    data.get("shippingLine1"),
    data.get("line1"),
    data.get("addressLine1"),
    data.get("street1"),
    shipping.get("address1"),
    shipping.get("address_1"),
    shipping.get("shippingAddress1"),
    shipping.get("shipping_address1"),
    shipping.get("line1"),
    shipping.get("addressLine1"),
    shipping.get("street1"),
    dig(shipping, "address", "line1"),
    dig(shipping, "address", "address1"),
  )
  address2 = pick(
    data.get("address2"),
    data.get("address_2"),
    data.get("shippingAddress2"),
    data.get("shipping_address2"),
    data.get("shippingLine2"),
    data.get("line2"),
    data.get("addressLine2"),
    data.get("street2"),
    shipping.get("address2"),
    shipping.get("address_2"),
    shipping.get("shippingAddress2"),
    shipping.get("shipping_address2"),
    shipping.get("line2"),
    shipping.get("addressLine2"),
    shipping.get("street2"),
    dig(shipping, "address", "line2"),
    dig(shipping, "address", "address2"),
  )
  city = pick(
    data.get("city"),
    data.get("shippingCity"),
    data.get("shipping_city"),
    shipping.get("city"),
    shipping.get("shippingCity"),
    dig(shipping, "address", "city"),
  )
  state = pick(
    data.get("state"),
    data.get("region"),
    data.get("shippingState"),
    data.get("shipping_state"),
    shipping.get("state"),
    shipping.get("region"),
    shipping.get("shippingState"),
    dig(shipping, "address", "state"),
  )
  postal_code = pick(
    data.get("postal_code"),
    data.get("postalCode"),
    data.get("zip"),
    data.get("zipCode"),
    data.get("shippingPostalCode"),
    data.get("shipping_postal_code"),
    shipping.get("postal_code"),
    shipping.get("postalCode"),
    shipping.get("zip"),
    shipping.get("zipCode"),
    shipping.get("shippingPostalCode"),
    dig(shipping, "address", "postal_code"),
    dig(shipping, "address", "postalCode"),
    dig(shipping, "address", "zip"),
  )
  country = pick(
    data.get("country"),
    data.get("shippingCountry"),
    data.get("shipping_country"),
    shipping.get("country"),
    shipping.get("shippingCountry"),
    dig(shipping, "address", "country"),
  )
  notes = pick(
    data.get("notes"),
    data.get("instructions"),
    data.get("shippingNotes"),
    data.get("shipping_notes"),
    shipping.get("notes"),
    shipping.get("instructions"),
    shipping.get("shippingNotes"),
  )

  print(
    "[coin-order] resolved fields:",
    {
      "coins": coins,
      "user_email": user_email,
      "display_name": display_name,
      "user_id": user_id,
      "session_id": session_id,
      "item_title": item_title,
      "item_size": item_size,
      "item_sku": item_sku,
      "item_category": item_category,
      "shipping_name": shipping_name,
      "shipping_phone": shipping_phone,
      "address1": address1,
      "address2": address2,
      "city": city,
      "state": state,
      "postal_code": postal_code,
      "country": country,
      "notes": notes,
      "shop_owner_email": SHOP_OWNER_EMAIL,
    },
  )

  try:
    send_coin_order_emails(
      user_email=user_email,
      coins_amount=coins,
      stripe_session_id=session_id,
      user_display_name=display_name,
      item_title=item_title,
      item_size=item_size,
      item_sku=item_sku,
      item_category=item_category,
      shipping_name=shipping_name,
      shipping_phone=shipping_phone,
      address1=address1,
      address2=address2,
      city=city,
      state=state,
      postal_code=postal_code,
      country=country,
      extra_notes=notes,
      raw_payload=data,
    )

    record_purchase_row(
      user_id=user_id,
      coins=coins,
      item_sku=item_sku,
      item_title=item_title,
      item_size=item_size,
      item_category=item_category,
      stripe_session_id=session_id,
      shipping_name=shipping_name,
      shipping_phone=shipping_phone,
      shipping_address1=address1,
      shipping_address2=address2,
      shipping_city=city,
      shipping_state=state,
      shipping_postal_code=postal_code,
      shipping_country=country,
      shipping_notes=notes,
    )

    return jsonify(ok=True)
  except Exception as e:
    print("[coin-order] error sending emails or recording purchase:", repr(e))
    return jsonify(ok=False, error=str(e)), 500

# -------------------------------------------------
# Debug route – send a test email
# -------------------------------------------------

@app.post("/debug/send-test-email")
def debug_send_test_email():
  body = request.get_json(silent=True) or {}
  code = body.get("code") or ""
  override_to = (body.get("to") or body.get("email") or "").strip()

  if ADMIN_SUPER_SECRET_CODE:
    if code != ADMIN_SUPER_SECRET_CODE:
      return jsonify(ok=False, error="invalid code"), 403
  else:
    print("[debug] ADMIN_SUPER_SECRET_CODE not set; skipping code check")

  target = (
    override_to
    or (os.getenv("DEBUG_TEST_EMAIL") or "").strip()
    or SHOP_OWNER_EMAIL
    or RESEND_FROM_EMAIL
  )

  if not target:
    print(
      "[debug] No target email configured for debug_send_test_email",
      "override_to:", override_to,
      "SHOP_OWNER_EMAIL:", SHOP_OWNER_EMAIL,
      "RESEND_FROM_EMAIL:", RESEND_FROM_EMAIL,
    )
    return jsonify(ok=False, error="no target email configured"), 400

  send_email(
    target,
    "Nova Tutoring Test Email",
    "If you got this, Resend HTTP works ✅",
    "<p>If you got this, Resend HTTP works ✅</p>",
  )
  return jsonify(ok=True, to=target)

# -------------------------------------------------
# Main (for local dev)
# -------------------------------------------------

if __name__ == "__main__":
  port = int(os.getenv("PORT") or 8787)
  app.run(host="0.0.0.0", port=port)