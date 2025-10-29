import os, sqlite3, threading
_DB_PATH = os.path.join(os.path.dirname(__file__), "coins.db")
_lock = threading.Lock()
def _conn():
    return sqlite3.connect(_DB_PATH, check_same_thread=False)
def init_db():
    with _lock, _conn() as c:
        c.execute("create table if not exists balances (user text primary key, balance integer not null)")
        c.commit()
def get_balance(user):
    with _lock, _conn() as c:
        cur = c.execute("select balance from balances where user=?", (user,))
        row = cur.fetchone()
        if row is None:
            c.execute("insert into balances(user,balance) values(?,0)", (user,))
            c.commit()
            return 0
        return int(row[0])
def add_coins(user, amount):
    with _lock, _conn() as c:
        bal = get_balance(user)
        bal += int(amount)
        c.execute("insert into balances(user,balance) values(?,?) on conflict(user) do update set balance=excluded.balance", (user, bal))
        c.commit()
        return bal
def set_balance(user, balance):
    with _lock, _conn() as c:
        c.execute("insert into balances(user,balance) values(?,?) on conflict(user) do update set balance=excluded.balance", (user, int(balance)))
        c.commit()
        return int(balance)
