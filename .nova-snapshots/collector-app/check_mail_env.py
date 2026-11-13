import os, ssl, smtplib, certifi
from dotenv import load_dotenv
load_dotenv()
u=(os.getenv("GMAIL_USER") or "").strip()
p=(os.getenv("GMAIL_APP_PASSWORD") or "").strip().replace("-", "")
print("USER=",u)
print("PASSLEN=",len(p))
ctx=ssl.create_default_context(cafile=certifi.where())
try:
    with smtplib.SMTP_SSL("smtp.gmail.com",465,context=ctx) as s:
        s.login(u,p)
    print("SSL465=OK")
except Exception as e:
    print("SSL465=ERR",type(e).__name__,str(e)[:200])
try:
    with smtplib.SMTP("smtp.gmail.com",587) as s:
        s.ehlo(); s.starttls(context=ctx); s.login(u,p)
    print("TLS587=OK")
except Exception as e:
    print("TLS587=ERR",type(e).__name__,str(e)[:200])
