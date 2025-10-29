from flask import Flask, request, jsonify
from email.message import EmailMessage
from dotenv import load_dotenv
import smtplib, os, json, datetime

load_dotenv()
app = Flask(__name__)

GMAIL_USER = os.getenv("GMAIL_USER")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")
GMAIL_TO = os.getenv("GMAIL_TO") or GMAIL_USER
PORT = int(os.getenv("MAIL_SERVICE_PORT") or "5060")

def format_items(items):
  if not items: return "No items listed"
  lines = []
  for it in items:
    title = str(it.get("title",""))
    qty = str(it.get("qty",1))
    price = str(it.get("price",""))
    lines.append(f"- {title} x{qty} @ {price}")
  return "\n".join(lines)

def send_order_email(data):
  order_id = str(data.get("order_id",""))
  buyer_email = str(data.get("buyer_email",""))
  total = str(data.get("total",""))
  ts = str(data.get("timestamp") or datetime.datetime.utcnow().isoformat())
  items = data.get("items",[])
  items_txt = format_items(items)
  subject = f"New Order {order_id} • {total}"
  body_text = f"New order received\nOrder ID: {order_id}\nBuyer: {buyer_email}\nTotal: {total}\nTime: {ts}\n\nItems:\n{items_txt}\n\nRaw:\n{json.dumps(data, indent=2)}"
  body_html = f"""<html><body style="font-family:system-ui,Segoe UI,Arial">
  <h2>New order received</h2>
  <p><b>Order ID:</b> {order_id}<br/><b>Buyer:</b> {buyer_email}<br/><b>Total:</b> {total}<br/><b>Time:</b> {ts}</p>
  <h3>Items</h3>
  <pre style="background:#0b0f14;color:#e5e7eb;padding:12px;border-radius:8px">{items_txt}</pre>
  <h3>Raw</h3>
  <pre style="background:#0b0f14;color:#9ca3af;padding:12px;border-radius:8px">{json.dumps(data, indent=2)}</pre>
  </body></html>"""
  msg = EmailMessage()
  msg["Subject"] = subject
  msg["From"] = GMAIL_USER
  msg["To"] = GMAIL_TO
  msg.set_content(body_text)
  msg.add_alternative(body_html, subtype="html")
  with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
    smtp.login(GMAIL_USER, GMAIL_APP_PASSWORD)
    smtp.send_message(msg)

@app.get("/health")
def health():
  return {"ok": True}

@app.post("/notify/test")
def notify_test():
  sample = {
    "order_id": "TEST-12345",
    "buyer_email": "buyer@example.com",
    "total": "$24.99",
    "timestamp": datetime.datetime.utcnow().isoformat(),
    "items": [
      {"title":"Nova Plush Head (Devil Bow)", "qty":1, "price":"$19.99"},
      {"title":"Star Sticker Pack", "qty":2, "price":"$2.50"}
    ]
  }
  send_order_email(sample)
  return {"sent": True}

@app.post("/notify/order")
def notify_order():
  try:
    data = request.get_json(force=True, silent=False)
    send_order_email(data or {})
    return {"sent": True}
  except Exception as e:
    return jsonify({"sent": False, "error": str(e)}), 400

if __name__ == "__main__":
  app.run(host="0.0.0.0", port=PORT, debug=True)
