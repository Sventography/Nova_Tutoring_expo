from flask import Blueprint, request, send_file
from io import BytesIO
from datetime import datetime
import os, time, urllib.parse

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.lib.colors import Color
import qrcode

bp = Blueprint("certs_pdf", __name__)

# Env-configurable assets (optional)
LOGO_PATH = os.getenv("NOVA_LOGO_PATH", "assets/logo.png")
SIG_PATH  = os.getenv("NOVA_SIG_PATH", "")  # optional
PUBLIC_BASE = os.getenv("NOVA_PUBLIC_BASE_URL", "").rstrip("/")  # optional verify link base

# Colors
CYAN   = Color(0.0, 0.9, 1.0)
GOLD   = Color(1.0, 0.82, 0.25)
NAVY   = Color(0.05, 0.07, 0.1)
WHITE  = Color(1, 1, 1)
MINT   = Color(0.45, 1.0, 0.85)
SILVER = Color(0.75, 0.8, 0.85)

def _build_verify_url(user: str, topic: str, score: int, issued_at: int) -> str:
    if not PUBLIC_BASE:
        return ""
    params = {
        "user": user,
        "topic": topic,
        "score": str(int(score)),
        "issued_at": str(int(issued_at)),
    }
    return f"{PUBLIC_BASE}/verify?" + urllib.parse.urlencode(params)

def _draw_logo(c, W, H):
    try:
        logo = ImageReader(LOGO_PATH)
        size = 170
        x = (W - size) / 2.0
        y = H/2.0 - 110
        c.drawImage(logo, x, y, size, size, mask="auto")
        return True
    except Exception:
        return False

def _draw_signature_image(c, cx, y_top):
    if not SIG_PATH:
        return False
    try:
        sig = ImageReader(SIG_PATH)
        target_w = 180.0
        iw, ih = sig.getSize()
        aspect = (ih / float(iw)) if iw else 0.35
        target_h = target_w * aspect
        c.drawImage(sig, cx - target_w/2.0, y_top, target_w, target_h, mask="auto")
        return True
    except Exception:
        return False

def generate_certificate_pdf(username: str, score: int, topic: str):
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    W, H = letter

    # frame
    m = 30.0
    left, right = m, W - m
    cx = (left + right) / 2.0

    c.setFillColor(NAVY); c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setStrokeColor(CYAN); c.setLineWidth(6)
    c.rect(left, m, right - left, H - 2*m, stroke=1, fill=0)

    # Title
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
    c.drawCentredString(cx, H - 290, f"with a score of {int(score)}%")

    # Logo
    if not _draw_logo(c, W, H):
        c.setFillColor(CYAN); c.setFont("Helvetica-Bold", 14)
        c.drawCentredString(cx, H/2.0 - 10, "Nova Tutoring")

    # Footer org/date
    c.setFillColor(CYAN); c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(cx, 170, "Nova Tutoring")

    issued_on = datetime.now().strftime("%B %d, %Y")
    c.setFillColor(SILVER); c.setFont("Helvetica", 12)
    c.drawCentredString(cx, 150, f"Issued on {issued_on}")

    # QR (optional verify link)
    issued_at = int(time.time())
    verify_url = _build_verify_url(username, topic, score, int(time.time()))
    if verify_url:
        qr_img = qrcode.make(verify_url)
        qr_bytes = BytesIO()
        qr_img.save(qr_bytes, format="PNG")
        qr_bytes.seek(0)
        qr_reader = ImageReader(qr_bytes)
        qr_size = 82.0
        c.drawImage(qr_reader, right - qr_size - 10, m + 10, qr_size, qr_size, mask="auto")

    # Signature (center)
    line_y = 105.0
    _draw_signature_image(c, cx, y_top=line_y + 10.0)

    c.setStrokeColor(SILVER); c.setLineWidth(1.2)
    line_w = 260.0
    c.line(cx - line_w/2.0, line_y, cx + line_w/2.0, line_y)

    c.setFillColor(SILVER); c.setFont("Helvetica-Oblique", 11)
    c.drawCentredString(cx, line_y - 14, "Eric Svenningson")
    c.drawCentredString(cx, line_y - 28, "Founder, Nova Tutoring")

    c.setFillColor(SILVER); c.setFont("Helvetica-Oblique", 11)
    c.drawCentredString(cx, 60, "Empowering Stars of Knowledge ✨")

    c.showPage(); c.save()
    buf.seek(0)
    return buf

@bp.get("/api/certificate.pdf")
def certificate_pdf():
    username = (request.args.get("user") or "Student").strip()
    topic = (request.args.get("topic") or "Quiz").strip()
    try:
        score = int(float(request.args.get("score") or 0))
    except Exception:
        score = 0

    pdf = generate_certificate_pdf(username=username, score=score, topic=topic)
    safe_topic = "".join([c for c in topic if c.isalnum() or c in ("-", "_", " ")]).strip().replace(" ", "_")
    name = f"certificate_{safe_topic or 'quiz'}.pdf"
    return send_file(pdf, as_attachment=True, download_name=name, mimetype="application/pdf")
