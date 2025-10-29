from flask import Flask, jsonify, request, g, Response, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import os, time, json, datetime as dt

# ----- OpenAI (Python SDK) -----
# pip install openai
from openai import OpenAI

# ----- DB / Auth -----
# pip install sqlalchemy pyjwt
from sqlalchemy import create_engine, Column, Integer, String, DateTime, or_
from sqlalchemy.orm import sessionmaker, declarative_base, scoped_session
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import jwt

# =========================
# Env & global setup
# =========================
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
JWT_SECRET = os.getenv("JWT_SECRET", "change-me")  # set a strong secret in .env
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///app.db")

client = OpenAI(api_key=OPENAI_API_KEY)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = scoped_session(sessionmaker(bind=engine))
Base = declarative_base()

# =========================
# Models
# =========================
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(64), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    coins = Column(Integer, default=0, nullable=False)
    questions_count = Column(Integer, default=0, nullable=False)
    teasers_correct = Column(Integer, default=0, nullable=False)
    avatar_url = Column(String(512), default="", nullable=False)
    created_at = Column(DateTime, default=dt.datetime.utcnow, nullable=False)


class Purchase(Base):
    __tablename__ = "purchases"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False)
    item_id = Column(String(64), nullable=False)
    item_name = Column(String(255), nullable=False)
    price = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=dt.datetime.utcnow, nullable=False)


Base.metadata.create_all(engine)

# =========================
# Helpers
# =========================
def create_token(uid: int, kind: str = "access", ttl_minutes: int = 60 * 24 * 7) -> str:
    payload = {
        "uid": uid,
        "kind": kind,
        "exp": dt.datetime.utcnow() + dt.timedelta(minutes=ttl_minutes),
        "iat": dt.datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def verify_token(token: str, expected_kind: str = "access"):
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        if data.get("kind") != expected_kind:
            return None
        uid = data.get("uid")
        if not uid:
            return None
        db = SessionLocal()
        try:
            return db.get(User, uid)
        finally:
            db.close()
    except Exception:
        return None


def auth_required(fn):
    from functools import wraps

    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify(error="auth required"), 401
        token = auth.split(" ", 1)[1].strip()
        user = verify_token(token, "access")
        if not user:
            return jsonify(error="invalid token"), 401
        g.user = user
        return fn(*args, **kwargs)

    return wrapper


def _receipt_no(p: Purchase) -> str:
    return f"NV-{p.id:06d}-{p.created_at.strftime('%Y%m%d')}"


def _purchase_json(p: Purchase) -> dict:
    return {
        "id": p.id,
        "item_id": p.item_id,
        "item_name": p.item_name,
        "price": p.price,
        "created_at": p.created_at.isoformat() + "Z",
        "receipt_no": _receipt_no(p),
    }


# =========================
# Flask app factory
# =========================
def create_app():
    app = Flask(__name__)
    app.url_map.strict_slashes = False

    # Uploads (dev)
    UPLOAD_ROOT = os.getenv("UPLOAD_ROOT", os.path.join(os.path.dirname(__file__), "uploads"))
    AVATAR_DIR = os.path.join(UPLOAD_ROOT, "avatars")
    os.makedirs(AVATAR_DIR, exist_ok=True)
    app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024  # 5 MB
    ALLOWED_IMAGE_EXTS = {"png", "jpg", "jpeg", "gif", "webp"}

    # CORS (dev-wide permissive)
    CORS(
        app,
        resources={r"/*": {"origins": "*"}},
        supports_credentials=False,
        allow_headers="*",
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    @app.before_request
    def _t0():
        request._t0 = time.time()

    @app.after_request
    def _log(resp):
        try:
            dur = (time.time() - getattr(request, "_t0", time.time())) * 1000.0
            print(f"[{time.strftime('%H:%M:%S')}] {request.method} {request.path} -> {resp.status_code} ({dur:.1f}ms)")
        finally:
            resp.headers.setdefault("Access-Control-Allow-Origin", "*")
            resp.headers.setdefault("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
            resp.headers.setdefault("Access-Control-Allow-Headers", "*")
            return resp

    @app.get("/health")
    def health():
        return jsonify(ok=True, service="nova-backend"), 200

    @app.get("/uploads/<path:subpath>")
    def serve_uploads(subpath: str):
        # Dev-only static serving for uploaded files
        return send_from_directory(UPLOAD_ROOT, subpath)

    @app.route("/api/<path:_rest>", methods=["OPTIONS"])
    def preflight(_rest):
        return ("", 204)

    # ---------- Ask milestone coins ----------
    def _coins_for_ask_milestone(next_q_count: int) -> int:
        if next_q_count == 1:
            return 25
        if next_q_count % 25 == 0:
            return next_q_count
        return 0

    def _user_json(u: User) -> dict:
        return {
            "id": u.id,
            "email": u.email,
            "username": u.username,
            "coins": u.coins,
            "questions_count": u.questions_count,
            "teasers_correct": u.teasers_correct,
            "avatar_url": u.avatar_url or "",
            "created_at": u.created_at.isoformat() + "Z",
        }

    # ---------- AUTH ----------
    @app.post("/api/auth/register")
    def register():
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip().lower()
        username = (data.get("username") or "").strip()
        password = data.get("password") or ""
        confirm = data.get("confirm") or ""
        if not email or not username or not password:
            return jsonify(error="missing fields"), 400
        if password != confirm:
            return jsonify(error="passwords do not match"), 400

        db = SessionLocal()
        try:
            exists = db.query(User).filter(or_(User.email == email, User.username == username)).first()
            if exists:
                return jsonify(error="email or username already in use"), 400
            u = User(
                email=email,
                username=username,
                password_hash=generate_password_hash(password, method="pbkdf2:sha256", salt_length=16),
                coins=0,
                questions_count=0,
                teasers_correct=0,
                avatar_url="",
            )
            db.add(u)
            db.commit()
            token = create_token(u.id, "access")
            return jsonify(token=token, user=_user_json(u)), 200
        finally:
            db.close()

    @app.post("/api/auth/login")
    def login():
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""
        db = SessionLocal()
        try:
            u = db.query(User).filter(User.email == email).first()
            if not u or not check_password_hash(u.password_hash, password):
                return jsonify(error="invalid credentials"), 401
            token = create_token(u.id, "access")
            return jsonify(token=token, user=_user_json(u)), 200
        finally:
            db.close()

    @app.post("/api/auth/forgot")
    def forgot():
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip().lower()
        db = SessionLocal()
        try:
            u = db.query(User).filter(User.email == email).first()
            if not u:
                return jsonify(ok=True), 200
            reset = create_token(u.id, "reset", ttl_minutes=15)
            return jsonify(ok=True, reset_token=reset), 200
        finally:
            db.close()

    @app.post("/api/auth/reset")
    def reset():
        data = request.get_json(silent=True) or {}
        token = (data.get("token") or "").strip()
        new_pw = data.get("password") or ""
        confirm = data.get("confirm") or ""
        if not token or not new_pw:
            return jsonify(error="missing token or password"), 400
        if new_pw != confirm:
            return jsonify(error="passwords do not match"), 400
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            if payload.get("kind") != "reset":
                return jsonify(error="invalid token"), 400
            uid = payload.get("uid")
        except Exception:
            return jsonify(error="invalid or expired token"), 400

        db = SessionLocal()
        try:
            u = db.get(User, uid)
            if not u:
                return jsonify(error="invalid user"), 400
            u.password_hash = generate_password_hash(new_pw, method="pbkdf2:sha256", salt_length=16)
            db.commit()
            return jsonify(ok=True), 200
        finally:
            db.close()

    @app.get("/api/me")
    @auth_required
    def me():
        return jsonify(user=_user_json(g.user)), 200

    @app.patch("/api/me")
    @auth_required
    def me_update():
        data = request.get_json(silent=True) or {}
        username = data.get("username")
        avatar_url = data.get("avatar_url")
        db = SessionLocal()
        try:
            u = db.get(User, g.user.id)
            if username:
                username = username.strip()
                if username and username != u.username:
                    if db.query(User).filter(User.username == username).first():
                        return jsonify(error="username taken"), 400
                    u.username = username
            if avatar_url is not None:
                u.avatar_url = str(avatar_url or "")
            db.commit()
            return jsonify(user=_user_json(u)), 200
        finally:
            db.close()

    # ---------- API Blueprint ----------
    from flask import Blueprint

    api = Blueprint("api", __name__, url_prefix="/api")

    @api.get("/ping")
    def ping():
        return jsonify(pong=True), 200

    # ----- Ask (OpenAI) -----
    @api.post("/ask")
    def ask():
        data = request.get_json(silent=True) or {}
        q = (data.get("question") or "").strip()
        if not q:
            return jsonify(error="missing 'question'"), 400
        try:
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are Nova, a warm, concise tutor. Keep answers clear and helpful."},
                    {"role": "user", "content": q},
                ],
                max_tokens=400,
                temperature=0.7,
            )
            answer = completion.choices[0].message.content if completion.choices else ""
        except Exception as e:
            return jsonify(error=f"LLM error: {str(e)[:200]}"), 500

        coins_awarded = 0
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            user = verify_token(auth.split(" ", 1)[1].strip(), "access")
            if user:
                db = SessionLocal()
                try:
                    u = db.get(User, user.id)
                    u.questions_count += 1
                    award = _coins_for_ask_milestone(u.questions_count)
                    if award:
                        u.coins += award
                        coins_awarded = award
                    db.commit()
                finally:
                    db.close()

        return jsonify(answer=answer, coins_awarded=coins_awarded), 200

    # ----- Brain Teasers grader -----
    @api.post("/teasers/check")
    def teaser_check():
        data = request.get_json(silent=True) or {}
        teaser = (data.get("teaser") or "").strip()
        ans = (data.get("answer") or "").strip()
        if not teaser or not ans:
            return jsonify(error="missing 'teaser' or 'answer'"), 400

        sys_prompt = (
            "You are a puzzle grader. Given a brain teaser and a user's answer, "
            "respond ONLY in strict JSON with keys: correct (boolean), feedback (string)."
        )
        usr_prompt = json.dumps({"teaser": teaser, "answer": ans})

        try:
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": usr_prompt},
                ],
                max_tokens=200,
                temperature=0.2,
            )
            raw = completion.choices[0].message.content if completion.choices else "{}"
            try:
                j = json.loads(raw)
                correct = bool(j.get("correct"))
                feedback = str(j.get("feedback") or "")
            except Exception:
                low = (raw or "").lower()
                correct = low.strip().startswith("correct")
                feedback = raw
        except Exception as e:
            return jsonify(error=f"LLM error: {str(e)[:200]}"), 500

        coins_awarded = 0
        if correct:
            auth = request.headers.get("Authorization", "")
            if auth.startswith("Bearer "):
                user = verify_token(auth.split(" ", 1)[1].strip(), "access")
                if user:
                    db = SessionLocal()
                    try:
                        u = db.get(User, user.id)
                        u.teasers_correct += 1
                        u.coins += 5
                        coins_awarded = 5
                        db.commit()
                    finally:
                        db.close()

        return jsonify(correct=correct, feedback=feedback, coins_awarded=coins_awarded), 200

    # ----- Avatar upload (multipart form-data) -----
    @api.post("/upload/avatar")
    @auth_required
    def upload_avatar():
        if "file" not in request.files:
            return jsonify(error="missing file"), 400
        file = request.files["file"]
        if not file or file.filename == "":
            return jsonify(error="empty filename"), 400
        ext = (file.filename.rsplit(".", 1)[-1] or "").lower()
        if ext not in {"png", "jpg", "jpeg", "gif", "webp"}:
            return jsonify(error="unsupported type"), 400

        fname = secure_filename(f"u{g.user.id}_{int(time.time())}.{ext}")
        save_path = os.path.join(AVATAR_DIR, fname)
        file.save(save_path)

        # Persist on user
        db = SessionLocal()
        try:
            u = db.get(User, g.user.id)
            u.avatar_url = f"/uploads/avatars/{fname}"
            db.commit()
            base = request.host_url.rstrip("/")
            return jsonify(
                ok=True,
                url=f"{base}{u.avatar_url}",
                user=_user_json(u),
            ), 200
        finally:
            db.close()

    # ----- SHOP -----
    SHOP_ITEMS = [
        # THEMES
        {"id": "theme_pink", "name": "Pink Theme", "price": 200, "image_key": "pink_theme.png", "type": "theme"},
        {"id": "theme_dark", "name": "Dark Theme", "price": 200, "image_key": "dark_theme.png", "type": "theme"},
        {"id": "theme_mint", "name": "Mint Theme", "price": 200, "image_key": "mint_theme.png", "type": "theme"},
        {"id": "theme_neon", "name": "Neon Theme", "price": 220, "image_key": "neon_theme.png", "type": "theme"},
        {"id": "theme_star", "name": "Star Theme", "price": 220, "image_key": "star_theme.png", "type": "theme"},
        {"id": "theme_black_gold", "name": "Black & Gold Theme", "price": 280, "image_key": "theme_black_gold.png", "type": "theme"},
        {"id": "theme_crimson_dream", "name": "Crimson Dream Theme", "price": 280, "image_key": "theme_crimson_dream.png", "type": "theme"},
        {"id": "theme_emerald_wave", "name": "Emerald Wave Theme", "price": 280, "image_key": "theme_emerald_wave.png", "type": "theme"},
        {"id": "theme_neon_purple", "name": "Neon Purple Theme", "price": 280, "image_key": "theme_neon_purple.png", "type": "theme"},
        {"id": "theme_silver_frost", "name": "Silver Frost Theme", "price": 280, "image_key": "theme_silver_frost.png", "type": "theme"},
        {"id": "theme_glitter", "name": "Glitter Theme", "price": 250, "image_key": "glitter_theme.png", "type": "theme"},

        # CURSORS / TRAILS
        {"id": "cursor_arrow", "name": "Arrow Cursor", "price": 120, "image_key": "arrow_cursor.png", "type": "cursor"},
        {"id": "cursor_glow", "name": "Glow Cursor", "price": 150, "image_key": "glow_cursor.png", "type": "cursor"},
        {"id": "cursor_orb", "name": "Orb Cursor", "price": 150, "image_key": "orb_cursor.png", "type": "cursor"},
        {"id": "cursor_star", "name": "Star Cursor", "price": 150, "image_key": "star_cursor.png", "type": "cursor"},
        {"id": "trail_star", "name": "Star Trail", "price": 160, "image_key": "trail_star.png", "type": "trail"},

        # PLUSHIES
        {"id": "plush_nova_devil", "name": "Plushie: Nova Devil", "price": 420, "image_key": "nova_plushie_devil.png", "type": "plush"},
        {"id": "plush_nova_purple", "name": "Plushie: Nova Purple", "price": 420, "image_key": "nova_plushie_purple.png", "type": "plush"},
        {"id": "plush_bunny_front", "name": "Plushie: Bunny (Front)", "price": 360, "image_key": "plushie_bunny_front.png", "type": "plush"},
        {"id": "plush_bunny_back", "name": "Plushie: Bunny (Back)", "price": 360, "image_key": "plushie_bunny_back.png", "type": "plush"},
        {"id": "plush_bunny_front_white", "name": "Plushie: Bunny White (Front)", "price": 360, "image_key": "plushie_bunny_front_white.png", "type": "plush"},
        {"id": "plush_bunny_back_white", "name": "Plushie: Bunny White (Back)", "price": 360, "image_key": "plushie_bunny_back_white.png", "type": "plush"},
        {"id": "plush_star", "name": "Plushie: Star", "price": 360, "image_key": "plushie_star.png", "type": "plush"},
        {"id": "plush_nova_pajamas_front", "name": "Plushie: Nova Pajamas (Front)", "price": 420, "image_key": "plushie_nova_pajamas_front.png", "type": "plush"},
        {"id": "plush_nova_pajamas_back", "name": "Plushie: Nova Pajamas (Back)", "price": 420, "image_key": "plushie_nova_pajamas_back.png", "type": "plush"},
        {"id": "plush_nova_bunny_front", "name": "Plushie: Nova Bunny (Front)", "price": 380, "image_key": "nova_bunny_front.png", "type": "plush"},

        # APPAREL
        {"id": "hoodie", "name": "Hoodie", "price": 520, "image_key": "hoodie.png", "type": "apparel"},
        {"id": "hat", "name": "Hat", "price": 260, "image_key": "hat.png", "type": "apparel"},
        {"id": "beanie", "name": "Beanie", "price": 240, "image_key": "beanie.png", "type": "apparel"},
        {"id": "pajamas", "name": "Pajamas", "price": 480, "image_key": "pajamas.png", "type": "apparel"},
        {"id": "pajama_bottoms", "name": "Pajama Bottoms", "price": 260, "image_key": "pajama_bottoms.png", "type": "apparel"},

        # ACCESSORIES / BUNDLES
        {"id": "keychain", "name": "Keychain", "price": 120, "image_key": "keychain.png", "type": "accessory"},
        {"id": "phone_case", "name": "Phone Case", "price": 300, "image_key": "case.png", "type": "accessory"},
        {"id": "stationery", "name": "Stationery Set", "price": 140, "image_key": "stationery.png", "type": "accessory"},
        {"id": "bundle_neon", "name": "Neon Bundle", "price": 600, "image_key": "bundle_neon.png", "type": "bundle",
         "description": "Neon Theme + Glow Cursor + Star Trail"},

        # COIN PACKS (dev helper — grants coins without cost)
        {"id": "coins_1000", "name": "Coins Pack (1000)", "price": 0, "image_key": "coins_1000.png", "type": "coins", "coins_grant": 1000},
        {"id": "coins_5000", "name": "Coins Pack (5000)", "price": 0, "image_key": "coins_5000.png", "type": "coins", "coins_grant": 5000},
    ]

    @api.get("/shop/list")
    def shop_list():
        return jsonify(items=SHOP_ITEMS), 200

    @api.post("/shop/purchase")
    @auth_required
    def shop_purchase():
        data = request.get_json(silent=True) or {}
        item_id = (data.get("item_id") or "").strip()
        item = next((i for i in SHOP_ITEMS if i["id"] == item_id), None)
        if not item:
            return jsonify(error="item not found"), 404

        db = SessionLocal()
        try:
            u = db.get(User, g.user.id)
            price = int(item.get("price", 0))
            itype = item.get("type")

            if itype == "coins":
                grant = int(item.get("coins_grant", 0))
                u.coins += grant
                # record a $0 purchase for receipt history
                p = Purchase(user_id=u.id, item_id=item["id"], item_name=item["name"], price=0)
                db.add(p); db.commit()
                return jsonify(ok=True, user=_user_json(u),
                               purchase={**_purchase_json(p), "granted": grant}), 200

            if u.coins < price:
                return jsonify(error="not enough coins"), 400

            u.coins -= price
            p = Purchase(user_id=u.id, item_id=item["id"], item_name=item["name"], price=price)
            db.add(p); db.commit()
            return jsonify(ok=True, user=_user_json(u), purchase=_purchase_json(p)), 200
        finally:
            db.close()

    @api.get("/shop/purchases")
    @auth_required
    def shop_purchases():
        db = SessionLocal()
        try:
            rows = db.query(Purchase).filter(Purchase.user_id == g.user.id).order_by(Purchase.created_at.desc()).all()
            return jsonify(purchases=[_purchase_json(p) for p in rows]), 200
        finally:
            db.close()

    @api.get("/shop/receipt/<int:pid>")
    @auth_required
    def shop_receipt(pid: int):
        db = SessionLocal()
        try:
            p = db.get(Purchase, pid)
            if not p or p.user_id != g.user.id:
                return jsonify(error="not found"), 404
            user = db.get(User, g.user.id)
            return jsonify(
                receipt={
                    **_purchase_json(p),
                    "user": {"id": user.id, "email": user.email, "username": user.username},
                }
            ), 200
        finally:
            db.close()

    @api.get("/shop/receipt/<int:pid>/download")
    @auth_required
    def shop_receipt_download(pid: int):
        db = SessionLocal()
        try:
            p = db.get(Purchase, pid)
            if not p or p.user_id != g.user.id:
                return jsonify(error="not found"), 404
            user = db.get(User, g.user.id)
            rn = _receipt_no(p)
            lines = [
                f"Nova Tutoring — Receipt {rn}",
                "-" * 40,
                f"Date:      {p.created_at.isoformat()}Z",
                f"User:      {user.username} <{user.email}> (id {user.id})",
                f"Item:      {p.item_name} ({p.item_id})",
                f"Price:     {p.price} coins",
                "",
                "Thank you for your purchase!",
            ]
            txt = "\n".join(lines)
            headers = {
                "Content-Disposition": f'attachment; filename="receipt_{rn}.txt"',
                "Cache-Control": "no-store",
            }
            return Response(txt, mimetype="text/plain", headers=headers)
        finally:
            db.close()

    # register blueprint
    app.register_blueprint(api)
    return app


# =========================
# Entrypoint
# =========================
app = create_app()

if __name__ == "__main__":
    # Bind to all interfaces so iOS/Android on LAN can reach it
    app.run(host="0.0.0.0", port=5055, debug=True)

