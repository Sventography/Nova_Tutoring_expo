from __future__ import annotations
import os, ssl, smtplib
from email.message import EmailMessage
from typing import Iterable, List, Optional, Union

def _split_emails(raw: str) -> List[str]:
    out: List[str] = []
    for part in (raw or "").replace(";", ",").split(","):
        e = part.strip()
        if e:
            out.append(e)
    return out

def get_admin_emails() -> List[str]:
    # Preferred: ADMIN_EMAILS="a@x.com,b@y.com"
    admin_emails = _split_emails(os.getenv("ADMIN_EMAILS", ""))
    if admin_emails:
        return admin_emails

    # Back-compat: ADMIN_EMAIL="a@x.com" and/or ORDERS_TO_EMAIL="b@y.com"
    single = (os.getenv("ORDERS_TO_EMAIL", "") or os.getenv("ADMIN_EMAIL", "") or "").strip()
    return _split_emails(single)

def send_email(to: Union[str, Iterable[str]], subject: str, body: str) -> bool:
    smtp_host = (os.getenv("SMTP_HOST", "") or "").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587") or "587")
    smtp_user = (os.getenv("SMTP_USER", "") or "").strip()
    smtp_pass = (os.getenv("SMTP_PASS", "") or "").strip()
    sender = (os.getenv("MAIL_FROM", "") or "").strip() or smtp_user or "no-reply@localhost"

    to_list = [to] if isinstance(to, str) else list(to)
    to_list = [x.strip() for x in to_list if (x or "").strip()]

    if not to_list:
        raise RuntimeError("send_email: missing recipient(s)")

    # If SMTP not configured, print to console (dev-friendly)
    if not smtp_host:
        print("EMAIL (no SMTP configured) ->")
        print("From:", sender)
        print("To:", ", ".join(to_list))
        print("Subject:", subject)
        print(body)
        return True

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = ", ".join(to_list)
    msg.set_content(body)

    context = ssl.create_default_context()
    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.ehlo()
        server.starttls(context=context)
        if smtp_user:
            server.login(smtp_user, smtp_pass)
        server.send_message(msg)

    return True

def send_admin_and_buyer(
    *,
    buyer_email: Optional[str],
    admin_subject: str,
    admin_body: str,
    buyer_subject: str,
    buyer_body: str,
) -> dict:
    results = {"sentAdmin": False, "sentBuyer": False}

    admins = get_admin_emails()
    if admins:
        try:
            results["sentAdmin"] = bool(send_email(admins, admin_subject, admin_body))
        except Exception as e:
            print("[email] admin send error:", e)

    if buyer_email and buyer_email.strip():
        try:
            results["sentBuyer"] = bool(send_email(buyer_email.strip(), buyer_subject, buyer_body))
        except Exception as e:
            print("[email] buyer send error:", e)

    return results
