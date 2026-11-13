from flask import Blueprint, jsonify, request
from time import time

bp = Blueprint("events", __name__)
EVENTS = []
SEQ = 0

def push_event(kind, data):
    global SEQ
    SEQ += 1
    EVENTS.append({"seq": SEQ, "ts": time(), "kind": kind, "data": data})
    if len(EVENTS) > 200:
        del EVENTS[: len(EVENTS) - 200]

@bp.get("/events/latest")
def latest():
    last = EVENTS[-1] if EVENTS else None
    return jsonify(last or {})
