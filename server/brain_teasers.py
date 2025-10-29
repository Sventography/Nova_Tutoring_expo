import os, json, datetime, hashlib, re
from flask import Blueprint, request, jsonify
try:
    from openai import OpenAI
    _client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
except Exception:
    _client = None

bp = Blueprint('brain_teasers', __name__)

CACHE_DIR = os.path.join(os.path.dirname(__file__), 'cache')
os.makedirs(CACHE_DIR, exist_ok=True)

def _norm(s: str) -> str:
    return re.sub(r'[^a-z0-9]+', '', (s or '').strip().lower())

def _cache_path(date_str: str) -> str:
    return os.path.join(CACHE_DIR, f'brainteasers-{date_str}.json')

def _seed(date_str: str) -> str:
    salt = os.environ.get('BRAINTEASER_SALT', 'nova-salt')
    return hashlib.sha256(f'{date_str}-{salt}'.encode()).hexdigest()[:16]

def _generate(date_str: str):
    if _client is None:
        raise RuntimeError('OpenAI not available. Install openai and set OPENAI_API_KEY.')
    seed = _seed(date_str)
    prompt = (
        f'Generate exactly 5 short brain teasers for {date_str}.\n'
        'Return STRICT JSON: list of 5 objects with fields id, question, answer, category, difficulty (easy|medium|hard).\n'
        'Ensure a single best answer. Diverse types (logic, word, math, pattern).\n'
        f'Include seed {seed} inside id. No extra text, ONLY JSON.'
    )
    resp = _client.chat.completions.create(
        model='gpt-4o-mini',
        messages=[{'role':'user','content':prompt}],
        temperature=0.6,
    )
    text = resp.choices[0].message.content.strip()
    data = json.loads(text)
    if not isinstance(data, list) or len(data) != 5:
        raise ValueError('Model did not return 5 items.')
    for t in data:
        t['answer_norm'] = _norm(t.get('answer'))
    return data

@bp.route('/api/brainteasers', methods=['GET'])
def get_daily():
    date_str = request.args.get('date') or datetime.date.today().isoformat()
    path = _cache_path(date_str)
    if os.path.exists(path):
        with open(path, 'r') as f:
            teasers = json.load(f)
    else:
        teasers = _generate(date_str)
        with open(path, 'w') as f:
            json.dump(teasers, f)
    safe = [{k:v for k,v in t.items() if k not in ('answer_norm','answer')} for t in teasers]
    return jsonify({'date': date_str, 'teasers': safe})

@bp.route('/api/brainteasers/verify', methods=['POST'])
def verify():
    payload = request.get_json(force=True)
    date_str = payload.get('date') or datetime.date.today().isoformat()
    tid = payload.get('id')
    uans = payload.get('answer','')
    path = _cache_path(date_str)
    if not os.path.exists(path):
        return jsonify({'ok': False, 'reason':'not_ready'}), 400
    with open(path, 'r') as f:
        teasers = json.load(f)
    t = next((x for x in teasers if x.get('id') == tid), None)
    if not t:
        return jsonify({'ok': False, 'reason':'not_found'}), 404
    if _norm(uans) == t.get('answer_norm',''):
        return jsonify({'ok': True, 'match':'exact', 'correct_answer': t.get('answer')})
    if _client is None:
        return jsonify({'ok': False, 'reason':'no_semantic_check'}), 500
    judge = (
        f'Question: {t.get('question')}\n'
        f'Canonical answer: {t.get('answer')}\n'
        f'User answer: {uans}\n'
        'Reply ONLY JSON: {"correct": true|false}'
    )
    resp = _client.chat.completions.create(
        model='gpt-4o-mini',
        messages=[{'role':'user','content':judge}],
        temperature=0.0,
    )
    try:
        verdict = bool(json.loads(resp.choices[0].message.content.strip()).get('correct', False))
    except Exception:
        verdict = False
    return jsonify({
        'ok': verdict,
        'match': 'semantic' if verdict else 'none',
        'correct_answer': t.get('answer') if verdict else None
    })

__all__ = ['bp']
