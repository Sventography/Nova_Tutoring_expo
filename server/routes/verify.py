from flask import Blueprint, request
from html import escape
from datetime import datetime

bp = Blueprint("verify", __name__)

@bp.get("/verify")
def verify():
    user = request.args.get("user", "").strip()
    topic = request.args.get("topic", "").strip()
    score = request.args.get("score", "").strip()
    issued_at = request.args.get("issued_at", "").strip()

    # basic validation (keeps it robust, not strict)
    safe_user = escape(user or "Student")
    safe_topic = escape(topic or "Quiz")
    safe_score = escape(score or "—")

    issued_str = "—"
    try:
        if issued_at:
            ts = int(issued_at)
            issued_str = datetime.fromtimestamp(ts).strftime("%B %d, %Y %I:%M %p")
    except Exception:
        issued_str = "—"

    html = f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Nova Certificate Verification</title>
  <style>
    body {{
      margin: 0; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial;
      background: #071018; color: #eafcff;
    }}
    .wrap {{ max-width: 720px; margin: 0 auto; padding: 22px; }}
    .card {{
      border: 2px solid #27e6ff; border-radius: 14px; padding: 18px;
      background: linear-gradient(135deg, #0b1320, #08121b, #070d14);
      box-shadow: 0 0 20px rgba(39,230,255,0.18);
    }}
    .title {{ font-size: 22px; font-weight: 900; color: #70f5ff; text-align:center; margin: 0 0 10px; }}
    .ok {{ text-align:center; color:#5df2ff; font-weight:800; margin-bottom: 14px; }}
    .row {{ display:flex; gap:12px; margin: 10px 0; }}
    .k {{ width: 130px; color:#bfefff; opacity:0.9; }}
    .v {{ flex:1; color:#ffffff; font-weight:700; }}
    .fine {{ color:#8cc9da; font-size: 12px; margin-top: 14px; line-height: 1.35; }}
    .badge {{ display:inline-block; padding:6px 10px; border-radius:999px; border:1px solid rgba(93,242,255,0.55); color:#5df2ff; font-weight:800; }}
    @media print {{
      body {{ background: #fff; color: #000; }}
      .card {{ box-shadow:none; border-color:#000; }}
      .title, .ok {{ color:#000; }}
      .badge {{ border-color:#000; color:#000; }}
    }}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="title">Nova Certificate Verification</div>
      <div class="ok"><span class="badge">Verified</span></div>

      <div class="row"><div class="k">Student</div><div class="v">{safe_user}</div></div>
      <div class="row"><div class="k">Quiz</div><div class="v">{safe_topic}</div></div>
      <div class="row"><div class="k">Score</div><div class="v">{safe_score}%</div></div>
      <div class="row"><div class="k">Issued</div><div class="v">{escape(issued_str)}</div></div>

      <div class="fine">
        This page confirms the QR code embedded on a Nova Tutoring certificate.
        If the displayed information does not match the certificate, treat it as unverified.
      </div>
    </div>
  </div>
</body>
</html>"""
    return html
