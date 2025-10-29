from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.lib.colors import Color
from io import BytesIO
from flask import send_file
import os
import time
import urllib.parse
from datetime import datetime


# --- Nova: build verify URL with issued_at ---
def _build_verify_url(user: str, topic: str, score: int, issued_at: int) -> str:
    issued_at = int(time.time())  # Nova: real issuance epoch
    base = os.getenv("NOVA_PUBLIC_BASE_URL", "http://127.0.0.1:5050").rstrip("/")
    params = {
        "user": user,
        "topic": topic,
        "score": str(int(score)),
        "issued_at": str(int(issued_at)),
    }
    return f"{base}/verify?" + urllib.parse.urlencode(params)

import qrcode  # QR code generator

# Prefer env vars; fallback to defaults
LOGO_PATH = os.getenv("NOVA_LOGO_PATH", "assets/logo.png")
SIG_PATH  = os.getenv("NOVA_SIG_PATH", "")  # optional image signature
DRAW_GUIDE = False  # set True if you want to visualize center

# Colors
CYAN   = Color(0, 1, 1)
GOLD   = Color(1, 0.84, 0)
NAVY   = Color(0.05, 0.07, 0.1)
WHITE  = Color(1, 1, 1)
MINT   = Color(0.5, 1, 0.8)
SILVER = Color(0.7, 0.7, 0.7)
GUIDE  = Color(1, 0, 1, alpha=0.45)

def _draw_centered_logo(c, width, height):
    try:
        logo = ImageReader(LOGO_PATH)
        size = 180
        x = (width - size) / 2.0
        y = height/2.0 - 120
        c.drawImage(logo, x, y, size, size, mask='auto')
        return True
    except Exception:
        return False

def _draw_centered_signature_image(c, center_x, y_top):
    if not SIG_PATH:
        return False
    try:
        sig = ImageReader(SIG_PATH)
        target_w = 180.0
        iw, ih = sig.getSize()
        aspect = (ih / float(iw)) if iw else 0.35
        target_h = target_w * aspect
        c.drawImage(sig, center_x - target_w/2.0, y_top, target_w, target_h, mask='auto')
        return True
    except Exception:
        return False

def generate_certificate_pdf(username, score, topic):
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    W, H = letter

    # Inner frame + center
    m = 30.0
    left, right = m, W - m
    cx = (left + right) / 2.0

    # Background + border
    c.setFillColor(NAVY); c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setStrokeColor(CYAN); c.setLineWidth(6)
    c.rect(left, m, right - left, H - 2*m, stroke=1, fill=0)

    if DRAW_GUIDE:
        c.setStrokeColor(GUIDE); c.setLineWidth(1.2)
        c.line(cx, m, cx, H - m)

    # Title & body
    c.setFillColor(CYAN); c.setFont("Helvetica-Bold", 28)
    c.drawCentredString(cx, H - 110, "Certificate of Achievement")

    c.setFillColor(WHITE); c.setFont("Helvetica", 16)
    c.drawCentredString(cx, H - 150, "This certifies that")

    c.setFillColor(GOLD); c.setFont("Helvetica-Bold", 26)
    c.drawCentredString(cx, H - 195, username)

    c.setFillColor(WHITE); c.setFont("Helvetica", 16)
    c.drawCentredString(cx, H - 230, "has successfully completed the quiz on")

    c.setFillColor(MINT); c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(cx, H - 260, topic)

    c.setFillColor(WHITE); c.setFont("Helvetica", 16)
    c.drawCentredString(cx, H - 290, f"with a score of {score}%")

    # Seal (logo)
    if not _draw_centered_logo(c, W, H):
        c.setFillColor(CYAN); c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(cx, H/2.0 - 20, "[ Nova Logo Missing ]")

    # Issuer lines (moved up to leave room for centered signature)
    c.setFillColor(CYAN); c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(cx, 170, "Nova Tutoring")

    issued_on = datetime.now().strftime("%B %d, %Y")
    c.setFillColor(SILVER); c.setFont("Helvetica", 12)
    c.drawCentredString(cx, 150, f"Issued on {issued_on}")

    # QR code (in-memory; bottom-right inside frame)
    verify_url = _build_verify_url(user, topic, score, issued_at)
    qr_img = qrcode.make(verify_url)
    qr_bytes = BytesIO()
    qr_img.save(qr_bytes, format='PNG')
    qr_bytes.seek(0)
    qr_reader = ImageReader(qr_bytes)
    qr_size = 80.0
    c.drawImage(qr_reader, right - qr_size - 10, m + 10, qr_size, qr_size, mask='auto')

    # Founder signature (centered)
    line_y = 105.0
    _draw_centered_signature_image(c, cx, y_top=line_y + 10.0)

    c.setStrokeColor(SILVER); c.setLineWidth(1.2)
    line_w = 260.0
    c.line(cx - line_w/2.0, line_y, cx + line_w/2.0, line_y)

    c.setFillColor(SILVER); c.setFont("Helvetica-Oblique", 11)
    c.drawCentredString(cx, line_y - 14, "Eric Svenningson")
    c.drawCentredString(cx, line_y - 28, "Founder, Nova Tutoring")

    # Motto
    c.setFillColor(SILVER); c.setFont("Helvetica-Oblique", 11)
    c.drawCentredString(cx, 60, "Empowering Stars of Knowledge ✨")

    c.showPage(); c.save(); buf.seek(0)
    return buf

def send_certificate_pdf(username, score, topic):
    pdf = generate_certificate_pdf(username, score, topic)
    return send_file(pdf, as_attachment=True,
                     download_name=f"certificate_{topic}.pdf",
                     mimetype="application/pdf")
