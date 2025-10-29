from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv, find_dotenv
import os, re, smtplib, ssl
from email.message import EmailMessage
from datetime import datetime
from pathlib import Path
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from passlib.hash import bcrypt
from sqlalchemy import Column, Integer, String, DateTime, create_engine, select
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv(find_dotenv(usecwd=True)) or load_dotenv()
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

Base = declarative_base()
DB_PATH = Path(__file__).parent.joinpath("nova.db")
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
Session = sessionmaker(bind=engine)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, default="")
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(engine)

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
serializer = URLSafeTimedSerializer(SECRET_KEY)

def make_token(user_id: int) -> str:
    return serializer.dumps({"uid": user_id}, salt="access")

def verify_token(token: str, max_age: int = 60 * 60 * 24 * 7) -> int | None:
    try:
        data = serializer.loads(token, salt="access", max_age=max_age)
        return int(data.get("uid"))
    except (BadSignature, SignatureExpired):
        return None

def send_email(to_email: str, subject: str, body: str) -> bool:
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    sender = os.getenv("MAIL_FROM", smtp_user or "no-reply@localhost")
    if not smtp_host:
        print("EMAIL Fallback (no SMTP configured) ->")
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
        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls(context=context)
            if smtp_user:
                server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        return True
    except Exception as e:
        print("Email error:", e)
        return False

def ok(data=None, **kw):
    base = {"ok": True}
    if data is not None:
        base.update(data if isinstance(data, dict) else {"data": data})
    base.update(kw)
    return jsonify(base)

def bad(msg, code=400, **kw):
    base = {"ok": False, "error": msg}
    base.update(kw)
    return jsonify(base), code

def valid_email(s: str) -> bool:
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", s or ""))

@app.post("/auth/register")
def register():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    name = (body.get("name") or "").strip()
    pw = body.get("password") or ""
    cpw = body.get("confirm") or ""
    if not valid_email(email):
        return bad("invalid email")
    if len(pw) < 8:
        return bad("password must be at least 8 characters")
    if pw != cpw:
        return bad("passwords do not match")
    with Session() as s:
        if s.scalar(select(User).where(User.email == email)):
            return bad("email already registered")
        u = User(email=email, name=name, password_hash=bcrypt.hash(pw))
        s.add(u)
        s.commit()
        token = make_token(u.id)
        return ok({"token": token, "user": {"id": u.id, "email": u.email, "name": u.name}})

@app.post("/auth/login")
def login():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    pw = body.get("password") or ""
    with Session() as s:
        u = s.scalar(select(User).where(User.email == email))
        if not u or not bcrypt.verify(pw, u.password_hash):
            return bad("invalid credentials", 401)
        token = make_token(u.id)
        return ok({"token": token, "user": {"id": u.id, "email": u.email, "name": u.name}})

@app.post("/auth/request-reset")
def request_reset():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    if not valid_email(email):
        return bad("invalid email")
    with Session() as s:
        u = s.scalar(select(User).where(User.email == email))
        if not u:
            return ok({"sent": True})
        token = serializer.dumps({"uid": u.id}, salt="reset")
        base = os.getenv("APP_BASE_URL", "http://localhost:3000")
        link = f"{base}/reset?token={token}"
        subject = "Nova password reset"
        body = f"Hi,\n\nUse this link to reset your Nova password:\n{link}\n\nThis link expires in 1 hour."
        sent = send_email(u.email, subject, body)
        return ok({"sent": bool(sent)})

@app.post("/auth/reset")
def reset_pw():
    body = request.get_json(silent=True) or {}
    token = body.get("token") or ""
    pw = body.get("password") or ""
    cpw = body.get("confirm") or ""
    if len(pw) < 8:
        return bad("password must be at least 8 characters")
    if pw != cpw:
        return bad("passwords do not match")
    try:
        data = serializer.loads(token, salt="reset", max_age=3600)
        uid = int(data.get("uid"))
    except (BadSignature, SignatureExpired):
        return bad("invalid or expired token")
    with Session() as s:
        u = s.get(User, uid)
        if not u:
            return bad("user not found", 404)
        u.password_hash = bcrypt.hash(pw)
        s.commit()
        return ok({"reset": True})

@app.get("/auth/me")
def me():
    auth = request.headers.get("Authorization", "")
    token = auth.replace("Bearer ", "")
    uid = verify_token(token)
    if not uid:
        return bad("unauthorized", 401)
    with Session() as s:
        u = s.get(User, uid)
        if not u:
            return bad("unauthorized", 401)
        return ok({"user": {"id": u.id, "email": u.email, "name": u.name}})

from openai import OpenAI
client = None
api_key = os.getenv("OPENAI_API_KEY")
if api_key:
    try:
        client = OpenAI(api_key=api_key)
    except Exception:
        client = None

def llm_answer(prompt: str) -> str | None:
    if not client:
        return None
    try:
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        resp = client.chat.completions.create(
            model=model,
            temperature=0.6,
            messages=[
                {"role": "system", "content": "You are Nova — a sharp, sassy tutor with playful flair. Be concise and clear."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=400,
        )
        return (resp.choices[0].message.content or "").strip()
    except Exception as e:
        return f"Nova hiccup: {e}"

@app.post("/ask")
def ask():
    data = request.get_json(silent=True) or {}
    q = (data.get("question") or "").strip()
    if not q:
        return bad("empty question")
    ans = llm_answer(q)
    if not ans:
        ans = f"Sassy Nova here. You asked: “{q}”. No OpenAI key loaded."
    return ok({"answer": ans})

if __name__ == "__main__":
    print("DB:", DB_PATH.resolve())
    print("OPENAI_API_KEY loaded:", bool(api_key))
    print("SECRET_KEY present:", bool(SECRET_KEY))
    app.run(host=os.getenv("FLASK_RUN_HOST", "127.0.0.1"), port=int(os.getenv("FLASK_RUN_PORT", "5000")), debug=True)
