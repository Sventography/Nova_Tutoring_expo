from flask import Flask
from brain_teasers import bp as brain_bp
import os, hashlib, random, re
import brain_teasers as bt  # we’ll patch its generator in offline mode

app = Flask(__name__)
app.register_blueprint(brain_bp)

# Offline fallback: no OpenAI needed. Enable with BRAINTEASERS_OFFLINE=1
if os.environ.get("BRAINTEASERS_OFFLINE") == "1":
    def _norm(s: str) -> str:
        return re.sub(r"[^a-z0-9]+", "", (s or "").strip().lower())

    def offline_generate(date_str: str):
        bank = [
            {"id":"logic-a","question":"I speak without a mouth and hear without ears. What am I?","answer":"echo","category":"logic","difficulty":"easy"},
            {"id":"math-b","question":"What is the next number in the sequence 1, 1, 2, 3, 5, ?","answer":"8","category":"math","difficulty":"easy"},
            {"id":"word-c","question":"Which word becomes shorter when you add two letters to it?","answer":"short","category":"word","difficulty":"medium"},
            {"id":"lateral-d","question":"A man pushes his car to a hotel and says he’s bankrupt. Why?","answer":"monopoly","category":"lateral","difficulty":"medium"},
            {"id":"logic-e","question":"What has keys but can’t open locks?","answer":"piano","category":"logic","difficulty":"easy"},
            {"id":"pattern-f","question":"What comes next: O T T F F S S ?","answer":"E","category":"pattern","difficulty":"hard"},
            {"id":"math-g","question":"If two’s company and three’s a crowd, what are four and five?","answer":"nine","category":"word","difficulty":"easy"},
            {"id":"logic-h","question":"The more of this there is, the less you see. What is it?","answer":"darkness","category":"logic","difficulty":"easy"},
            {"id":"word-i","question":"What five-letter word in caps reads the same upside down?","answer":"SWIMS","category":"word","difficulty":"medium"},
            {"id":"math-j","question":"A farmer has 17 sheep; all but 9 die. How many are left?","answer":"9","category":"math","difficulty":"easy"},
        ]
        seed = hashlib.sha256((date_str + os.environ.get("BRAINTEASER_SALT","nova-salt")).encode()).hexdigest()
        rng = random.Random(int(seed[:8], 16))
        picks = rng.sample(bank, 5)
        for t in picks:
            t["answer_norm"] = _norm(t["answer"])
        return picks

    # Monkey-patch generation in the imported module
    bt._generate = offline_generate

@app.get("/api/ping")
def ping():
    return "pong"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5055)), debug=True)

