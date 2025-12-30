from __future__ import annotations

import os, ssl, smtplib, re
from email.message import EmailMessage
from typing import Optional, Dict, Any, List

def _valid_email(s: str) -> bool:
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", (s or "").strip()))

def _split_emails(s: str) -> List[str]:
    raw = (s or "").replace(";", ",")
    out = []
    for x in raw.split(","):
        x = x.strip()
        if x and _valid_email(x):
            out.append(x)
    return out

def send_email(to_email: str, subject: str, body: str) -> bool:
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    sender = os.getenv("MAIL_FROM", "") or smtp_user or "no-reply@localhost"

    # Dev fallback: print if SMTP not configured
    if not smtp_host:
        print("[mailer] SMTP_HOST missing; printing email instead.")
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

        ctx = ssl.create_default_context()
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls(context=ctx)
            if smtp_user:
                server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        return True
    except Exception as e:
        print("[mailer] send_email error:", e)
        return False

def send_admin_and_buyer(
    *,
    buyer_email: Optional[str],
    admin_subject: str,
    admin_body: str,
    buyer_subject: Optional[str] = None,
    buyer_body: Optional[str] = None,
) -> Dict[str, bool]:
    """
    Sends:
      - Admin email to ORDERS_TO_EMAIL (comma/semicolon list) else ADMIN_EMAIL
      - Buyer email to buyer_email (if valid)

    Returns: { sentAdmin: bool, sentBuyer: bool }
    """
    admin_list = _split_emails(os.getenv("ORDERS_TO_EMAIL", "").strip())
    if not admin_list:
        admin_list = _split_emails(os.getenv("ADMIN_EMAIL", "").strip())

    sent_admin = False
    sent_buyer = False

    if admin_list:
        sent_admin = True
        for a in admin_list:
            ok = send_email(a, admin_subject, admin_body)
            sent_admin = sent_admin and bool(ok)

    if buyer_email and _valid_email(buyer_email):
        subj = buyer_subject or "Nova — Order confirmation"
        body = buyer_body or "Thanks for your purchase!"
        sent_buyer = bool(send_email(buyer_email, subj, body))

    return {"sentAdmin": sent_admin, "sentBuyer": sent_buyer}
