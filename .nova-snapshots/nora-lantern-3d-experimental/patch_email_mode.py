import pathlib, re

p = pathlib.Path("server/coins_orders.py")
src = p.read_text(encoding="utf-8")

# Ensure imports exist (idempotent)
need_imports = [
    "import os",
    "import ssl",
    "import smtplib",
    "from email.message import EmailMessage",
]
for imp in need_imports:
    if imp not in src:
        src = imp + "\n" + src

pattern = re.compile(
    r"def\s+send_order_email\s*\([^)]*\):.*?^\s*return\s+True,\s*['\"]sent['\"]",
    re.S | re.M
)

replacement = r'''
def send_order_email(data, order_id):
  host = os.getenv("SMTP_HOST", "")
  port = int(os.getenv("SMTP_PORT", "587"))
  user = os.getenv("SMTP_USER", "")
  pwd  = os.getenv("SMTP_PASS", "")
  sender = os.getenv("MAIL_FROM", user or "no-reply@localhost")
  to = os.getenv("ORDERS_TO_EMAIL") or os.getenv("ADMIN_EMAIL") or user

  if not host or not to:
    return False, "SMTP not fully configured"

  subject = f"[Nova] Coin order {order_id} – {data.get('title') or data.get('itemId')}"
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
      # SMTPS (implicit SSL)
      with smtplib.SMTP_SSL(host, port, context=context) as server:
        if user:
          server.login(user, pwd)
        server.send_message(msg)
    else:
      # STARTTLS (e.g., smtp.gmail.com:587, office365:587)
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
'''.lstrip("\n")

if pattern.search(src):
    src = pattern.sub(replacement, src)
else:
    # Fallback: try to append if function not found
    if "def send_order_email" not in src:
        src += "\n\n" + replacement

p.write_text(src, encoding="utf-8")
print("Patched coins_orders.py ✅")
