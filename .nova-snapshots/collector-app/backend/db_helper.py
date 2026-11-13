import sqlite3, pathlib, time
import threading

DB_PATH = pathlib.Path("backend/data.sqlite")

def get_conn():
    return sqlite3.connect(DB_PATH)

def record_certificate(user_email: str, topic: str, score: int) -> dict:
    now = int(time.time())
    with get_conn() as con:
        cur = con.cursor()
        cur.execute("INSERT INTO certificates(user_email, topic, score, issued_at) VALUES (?,?,?,?)",
                    (user_email, topic, score, now))
        con.commit()
    return {"ok": True, "issued_at": now}

def count_certs(user_email: str) -> int:
    with get_conn() as con:
        (n,) = con.execute("SELECT COUNT(*) FROM certificates WHERE user_email=?", (user_email,)).fetchone()
        return n or 0

def list_certs(user_email: str):
    with get_conn() as con:
        rows = con.execute("SELECT topic, score, issued_at FROM certificates WHERE user_email=? ORDER BY issued_at DESC",(user_email,)).fetchall()
        return [{"topic":t,"score":s,"issued_at":ts} for (t,s,ts) in rows]

def list_achievements():
    with get_conn() as con:
        rows = con.execute("SELECT code,name,description,threshold,reward_coins FROM achievements ORDER BY threshold ASC").fetchall()
        return [dict(code=c,name=n,description=d,threshold=th, reward_coins=rc) for (c,n,d,th,rc) in rows]

def user_has_achievement(user_email: str, code: str) -> bool:
    with get_conn() as con:
        row = con.execute("SELECT 1 FROM user_achievements WHERE user_email=? AND achievement_code=?", (user_email, code)).fetchone()
        return bool(row)

def award_achievement(user_email: str, code: str):
    now = int(time.time())
    with get_conn() as con:
        con.execute("INSERT OR IGNORE INTO user_achievements(user_email, achievement_code, awarded_at) VALUES (?,?,?)",
                    (user_email, code, now))
        con.commit()

def coins_grant(user_email: str, amount: int):
    def _do():
        try:
            from backend.coins_db import add_coins  # your existing utility
            add_coins(user_email, amount)
        except Exception:
            pass

    t = threading.Thread(target=_do, daemon=True)
    t.start()
    # don't block request; give it up to 1s max
    t.join(timeout=1.0)
