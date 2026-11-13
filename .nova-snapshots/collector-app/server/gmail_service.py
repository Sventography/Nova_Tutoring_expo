import os
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from base64 import urlsafe_b64encode
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.image import MIMEImage
from email import encoders
from io import BytesIO

# pull in the official PDF generator
try:
    from server.certificate_pdf import generate_certificate_pdf
except ImportError:
    from certificate_pdf import generate_certificate_pdf

SCOPES = ['https://www.googleapis.com/auth/gmail.send']
TOKEN_PATH = os.getenv('GMAIL_TOKEN_JSON', 'token.json')

# For the verify button link (change this in prod)
BASE_URL = os.getenv('NOVA_BASE_URL', 'http://127.0.0.1:5050')

# Inline logo path for email (embedded so it shows in most clients)
LOGO_PATH = os.getenv('NOVA_LOGO_PATH', 'assets/logo.png')

def get_service():
    creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    return build('gmail', 'v1', credentials=creds)

def send_text(to, subject, body):
    msg = MIMEText(body)
    msg['to'] = to
    msg['subject'] = subject
    raw = urlsafe_b64encode(msg.as_bytes()).decode()
    service = get_service()
    sent = service.users().messages().send(userId='me', body={'raw': raw}).execute()
    return sent.get('id')

def _build_branded_html(username, score, topic, verify_url):
    # minimal, inbox-safe styles; table layout for better client support
    return f"""
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0b0f14;font-family:Arial,sans-serif;color:#ffffff;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b0f14;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0"
                 style="background:#0d1117;border:2px solid #00ffff;border-radius:16px;box-shadow:0 0 16px rgba(0,255,255,.25);">
            <tr>
              <td align="center" style="padding:24px 24px 8px;">
                <img src="cid:logo@nova" alt="Nova Tutoring" width="96" height="96"
                     style="display:block;border:0;outline:none;text-decoration:none;"/>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 24px 8px;">
                <h1 style="margin:0;font-size:24px;color:#00ffff;">🎓 Certificate of Achievement</h1>
                <div style="margin:6px 0 0;color:#cfd8dc;font-size:13px;">Issued by <strong>Nova Tutoring</strong></div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:16px 24px 8px;">
                <div style="font-size:16px;color:#ffffff;">This is proudly presented to</div>
                <div style="font-size:22px;color:#ffd700;font-weight:bold;margin-top:6px;">{username}</div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 24px 0;">
                <div style="font-size:16px;color:#c7e6ff;">for completing</div>
                <div style="font-size:18px;color:#00ffcc;font-weight:bold;margin:6px 0 0;">{topic}</div>
                <div style="font-size:16px;color:#e5f2ff;margin:10px 0 12px;">with a score of <strong>{score}%</strong></div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:6px 24px 24px;">
                <a href="{verify_url}" target="_blank"
                   style="display:inline-block;background:#00ffff;color:#0b0f14;
                          padding:12px 18px;border-radius:10px;font-weight:bold;
                          text-decoration:none;">View / Verify Certificate</a>
              </td>
            </tr>
          </table>
          <div style="color:#9aa4ad;font-size:12px;margin-top:10px;">If the button doesn’t work, open: {verify_url}</div>
        </td>
      </tr>
    </table>
  </body>
</html>
""".strip()

def send_certificate(to, username, score, topic):
    subject = f"Certificate of Achievement – {topic}"
    verify_url = f"{BASE_URL}/verify?user={username}&topic={topic}&score={score}"

    # ---- Build a multipart/related email with text+html (alternative) and inline logo ----
    root = MIMEMultipart('related')
    root['to'] = to
    root['subject'] = subject

    alt = MIMEMultipart('alternative')
    root.attach(alt)

    # Plain-text fallback
    text_part = MIMEText(
        f"Certificate of Achievement (Nova Tutoring)\n\n"
        f"Recipient: {username}\nTopic: {topic}\nScore: {score}%\n\n"
        f"View/Verify: {verify_url}\n", "plain"
    )
    alt.attach(text_part)

    # HTML body
    html = _build_branded_html(username, score, topic, verify_url)
    html_part = MIMEText(html, "html")
    alt.attach(html_part)

    # Inline logo (cid:logo@nova)
    try:
        with open(LOGO_PATH, "rb") as lf:
            logo_img = MIMEImage(lf.read())
            logo_img.add_header('Content-ID', '<logo@nova>')
            logo_img.add_header('Content-Disposition', 'inline', filename=os.path.basename(LOGO_PATH))
            root.attach(logo_img)
    except Exception:
        # no logo, it will just show text
        pass

    # Attach the OFFICIAL PDF (generated in-memory)
    pdf_buffer = generate_certificate_pdf(username, score, topic)  # BytesIO
    pdf_part = MIMEBase('application', 'pdf')
    pdf_part.set_payload(pdf_buffer.read())
    encoders.encode_base64(pdf_part)
    pdf_part.add_header('Content-Disposition', 'attachment', filename=f"certificate_{topic}.pdf")
    root.attach(pdf_part)

    raw = urlsafe_b64encode(root.as_bytes()).decode()
    service = get_service()
    sent = service.users().messages().send(userId='me', body={'raw': raw}).execute()
    return sent.get('id')
