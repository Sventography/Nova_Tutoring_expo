from flask import Flask, request, jsonify
from flask_cors import CORS
import json, os, threading, time, random, requests

app = Flask(__name__)
CORS(app)
STORE_PATH = os.path.join(os.path.dirname(__file__), "store.json")
lock = threading.Lock()

def load_store():
    if not os.path.exists(STORE_PATH):
        with open(STORE_PATH, "w") as f:
            json.dump({"balances": {}, "owned": {}, "brain_cache": {}}, f)
    with open(STORE_PATH, "r") as f:
        return json.load(f)

def save_store(data):
    with open(STORE_PATH, "w") as f:
        json.dump(data, f)

def get_balance(data, user):
    return int(data["balances"].get(user, 0))

def add_balance(data, user, amount):
    data["balances"][user] = get_balance(data, user) + int(amount)

def own_item(data, user, sku):
    owned = set(data["owned"].get(user, []))
    owned.add(sku)
    data["owned"][user] = sorted(list(owned))

def has_item(data, user, sku):
    return sku in set(data["owned"].get(user, []))

@app.get("/coins/balance")
def coins_balance():
    user = request.args.get("user", "default")
    with lock:
        data = load_store()
        return jsonify({"user": user, "balance": get_balance(data, user)})

@app.post("/coins/add")
def coins_add():
    body = request.get_json(force=True)
    user = body.get("user", "default")
    amount = int(body.get("amount", 0))
    reason = body.get("reason", "unspecified")
    with lock:
        data = load_store()
        add_balance(data, user, amount)
        save_store(data)
        return jsonify({"ok": True, "user": user, "delta": amount, "reason": reason, "balance": get_balance(data, user)})

@app.post("/coins/spend")
def coins_spend():
    body = request.get_json(force=True)
    user = body.get("user", "default")
    amount = int(body.get("amount", 0))
    if amount <= 0:
        return jsonify({"ok": False, "error": "amount_must_be_positive"}), 400
    with lock:
        data = load_store()
        bal = get_balance(data, user)
        if bal < amount:
            return jsonify({"ok": False, "error": "insufficient_funds", "balance": bal, "needed": amount}), 402
        add_balance(data, user, -amount)
        save_store(data)
        return jsonify({"ok": True, "user": user, "delta": -amount, "balance": get_balance(data, user)})

@app.post("/shop/purchase")
def shop_purchase():
    body = request.get_json(force=True)
    user = body.get("user", "default")
    sku = body.get("sku")
    price = int(body.get("price", 0))
    if not sku or price <= 0:
        return jsonify({"ok": False, "error": "bad_request"}), 400
    with lock:
        data = load_store()
        if has_item(data, user, sku):
            return jsonify({"ok": True, "user": user, "sku": sku, "already_owned": True})
        bal = get_balance(data, user)
        if bal < price:
            return jsonify({"ok": False, "error": "insufficient_funds", "balance": bal, "needed": price}), 402
        add_balance(data, user, -price)
        own_item(data, user, sku)
        save_store(data)
        return jsonify({"ok": True, "user": user, "sku": sku, "price": price, "balance": get_balance(data, user)})

def ai_teasers(count):
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        return None
    try:
        prompt = "Return a JSON array of brain teasers. Each item is an object with id,q,a,hint. 10 items, varied types, short answers, lowercase answers."
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": "gpt-4o-mini",
                "temperature": 0.7,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": "You generate concise brain teasers with short answers."},
                    {"role": "user", "content": prompt}
                ]
            },
            timeout=20
        )
        j = resp.json()
        if "choices" in j and j["choices"]:
            txt = j["choices"][0]["message"]["content"]
            data = json.loads(txt)
            arr = data if isinstance(data, list) else data.get("items") or data.get("teasers") or data.get("data")
            if not isinstance(arr, list):
                return None
            out = []
            for it in arr:
                if not isinstance(it, dict):
                    continue
                q = str(it.get("q","")).strip()
                a = str(it.get("a","")).strip()
                if not q or not a:
                    continue
                out.append({"id": str(it.get("id") or abs(hash(q)) % 10_000_000), "q": q, "a": a.lower(), "hint": it.get("hint") or ""})
            random.shuffle(out)
            return out[: max(1, int(count))]
    except Exception:
        return None
    return None

@app.get("/brain/daily")
def brain_daily():
    try:
        count = int(request.args.get("count", "5"))
    except:
        count = 5
    today = time.strftime("%Y-%m-%d")
    with lock:
        data = load_store()
        cache = data.setdefault("brain_cache", {})
        day = cache.get(today)
        if not day:
            items = ai_teasers(max(count, 10))
            if not items:
                static = [
                    {"id":"sum-odd-1","q":"What is the sum of the first 10 odd numbers?","a":"100","hint":"Think n²."},
                    {"id":"word-odd-one-1","q":"Which is the odd one out: tulip, rose, daisy, pine?","a":"pine","hint":"Three are flowers."},
                    {"id":"clock-angles-1","q":"At 3:00, what is the angle between hour and minute hands?","a":"90","hint":"Right angle."},
                    {"id":"sequence-1","q":"Fill the blank: 1, 1, 2, 3, 5, 8, __","a":"13","hint":"Fibonacci."},
                    {"id":"riddle-bridge-1","q":"What has keys but can’t open locks?","a":"piano","hint":"Musical."},
                    {"id":"anagram-1","q":"Unscramble: LISTEN","a":"silent","hint":"Anagram."},
                    {"id":"logic-true-1","q":"If all bloops are razzies and some razzies are lools, can some lools be bloops? (yes/no)","a":"yes","hint":"Syllogism."},
                    {"id":"math-div-1","q":"What is 1234 ÷ 2?","a":"617","hint":"Half of 1200 + half of 34."},
                    {"id":"riddle-egg-1","q":"What has to be broken before you can use it?","a":"egg","hint":"Breakfast."},
                    {"id":"pattern-evens-1","q":"Next number: 2, 4, 8, 16, __","a":"32","hint":"Powers of 2."}
                ]
                random.shuffle(static)
                items = static[:count]
            cache[today] = {"items": items}
            save_store(data)
        res = cache[today]
        return jsonify({"date": today, "items": res["items"][:count]})
