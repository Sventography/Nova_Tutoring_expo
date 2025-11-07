import os, ssl, smtplib, sys
from dotenv import load_dotenv, find_dotenv

# load .env from project root
load_dotenv(find_dotenv(usecwd=True)) or load_dotenv()

HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
PORT = int(os.getenv("SMTP_PORT", "587"))
USER = os.getenv("SMTP_USER", "")
PWD  = os.getenv("SMTP_PASS", "")
TO   = os.getenv("ORDERS_TO_EMAIL", USER)

print("Testing SMTP with:")
print(" host=", HOST, "port=", PORT)
print(" user=", USER)

def try_starttls():
    print("\n-- STARTTLS on 587 --")
    ctx = ssl.create_default_context()
    with smtplib.SMTP(HOST, 587) as s:
        s.ehlo()
        s.starttls(context=ctx)
        s.ehlo()
        s.login(USER, PWD)
        s.sendmail(USER or "no-reply@localhost", TO, "Subject: test\n\nhello from STARTTLS 587")
    print("STARTTLS OK")

def try_ssl():
    print("\n-- SMTPS on 465 --")
    ctx = ssl.create_default_context()
    with smtplib.SMTP_SSL(HOST, 465, context=ctx) as s:
        s.login(USER, PWD)
        s.sendmail(USER or "no-reply@localhost", TO, "Subject: test\n\nhello from SMTPS 465")
    print("SMTPS OK")

ok = False
try:
    if PORT == 465:
        try_ssl(); ok = True
    else:
        try_starttls(); ok = True
except Exception as e:
    print("Primary mode failed:", e)
    try:
        if PORT == 465:
            try_starttls(); ok = True
        else:
            try_ssl(); ok = True
    except Exception as e2:
        print("Fallback mode failed:", e2)

sys.exit(0 if ok else 1)
