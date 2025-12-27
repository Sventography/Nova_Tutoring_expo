from __future__ import annotations

import os
import ssl
import smtplib
from email.message import EmailMessage
from typing import Any, Dict, Tuple

try:
    from dotenv import load_dotenv, find_dotenv
    load_dotenv(find_dotenv(usecwd=True)) or load_dotenv()
except Exception:
    pass


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Sends a plain-text email using SMTP settings from env.
    Falls back to printing if SMTP_HOST is not set.
    """
    smtp_host = _env("SMTP_HOST")
    smtp_port = int(_env("SMTP_PORT", "587") or "587")
    smtp_user = _env("SMTP_USER")
    smtp_pass = _env("SMTP_PASS")
    sender = _env("MAIL_FROM", smtp_user or "no-reply@localhost")

    if not smtp_host:
        print("\n[mailer] SMTP_HOST not set — printing email instead of sending.")
        print("To:", to_email)
        print("Subject:", subject)
        print(body)
        print()
        return True

    try:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = sender
        msg["To"] = to_email
        msg.set_content(body)

        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            if smtp_user:
                server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        return True
    except Exception as e:
        print("[mailer] send_email error:", e)
        return False


def _format_order(order: Dict[str, Any]) -> Tuple[str, str]:
    title = order.get("title") or order.get("sku") or "Order"
    oid = order.get("id") or "ord_unknown"
    status = order.get("status") or "paid"
    price_coins = order.get("priceCoins", 0)

    sh = order.get("shipping") or {}
    lines = [
        f"Order ID: {oid}",
        f"Status: {status}",
        "",
        f"Item: {title}",
        f"SKU: {order.get('sku','')}",
        f"Price (coins): {price_coins}",
        "",
        "Ship To:",
        f"  {sh.get('name','')}",
        f"  {sh.get('address1','')}",
    ]
    if sh.get("address2"):
        lines.append(f"  {sh.get('address2')}")
    lines += [
        f"  {sh.get('city','')}, {sh.get('state','')} {sh.get('zip','')}",
        f"  {sh.get('country','US')}",
    ]
    if sh.get("size"):
        lines.append(f"  Size: {sh.get('size')}")
    lines += [
        "",
        f"Buyer email: {sh.get('email','')}",
    ]

    subject = f"[Nova] Order {oid} — {title}"
    body = "\n".join(lines)
    return subject, body


def send_admin_and_buyer(order: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sends:
      - Admin notification to ADMIN_EMAIL (or ORDERS_TO_EMAIL if set)
      - Buyer confirmation to shipping.email
    """
    admin_to = _env("ORDERS_TO_EMAIL") or _env("ADMIN_EMAIL")
    sh = order.get("shipping") or {}
    buyer_to = (sh.get("email") or "").strip()

    subj, body = _format_order(order)

    sent_admin = False
    if admin_to:
        sent_admin = bool(send_email(admin_to, f"NEW ORDER: {subj}", body))
    else:
        print("[mailer] ADMIN_EMAIL not set; skipping admin email")

    sent_buyer = False
    if buyer_to:
        buyer_subj = f"[Nova] We received your order {order.get('id','')}"
        buyer_body = (
            "Thanks for your purchase!\n\n"
            "Here are your order details:\n\n"
            + body
            + "\n\n— Nova Tutoring"
        )
        sent_buyer = bool(send_email(buyer_to, buyer_subj, buyer_body))
    else:
        print("[mailer] buyer email missing; skipping buyer email")

    return {"sentAdmin": sent_admin, "sentBuyer": sent_buyer, "adminTo": admin_to, "buyerTo": buyer_to}
