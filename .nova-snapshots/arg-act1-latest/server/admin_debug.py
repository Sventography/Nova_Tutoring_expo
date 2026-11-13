from __future__ import annotations
import os, json
from pathlib import Path
from flask import Blueprint, jsonify, request, current_app

admin_debug = Blueprint("admin_debug", __name__)

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

def _orders_log_path() -> Path:
    p = os.getenv("ORDERS_LOG_PATH", "")
    return Path(p) if p else Path(__file__).parent.joinpath("orders.log")

def _admin_key() -> str:
    return os.getenv("ADMIN_KEY", "")

@admin_debug.get("/health")
def health():
    return ok({"status":"ok"})

@admin_debug.get("/admin/debug")
def admin_debug_info():
    key = request.headers.get("X-Admin-Key", "")
    if not _admin_key() or key != _admin_key():
        return bad("unauthorized", 401)
    path = _orders_log_path()
    exists = path.exists()
    size = path.stat().st_size if exists else 0
    head = []
    if exists:
        with path.open("r", encoding="utf-8") as f:
            for i, line in enumerate(f):
                if i >= 3: break
                head.append(line.strip())
    return ok({
        "ORDERS_LOG_PATH": str(path),
        "exists": exists,
        "size": size,
        "head": head,
        "admin_key_loaded": bool(_admin_key()),
    })

@admin_debug.get("/admin/__routes")
def routes_dump():
    key = request.headers.get("X-Admin-Key", "")
    if not _admin_key() or key != _admin_key():
        return bad("unauthorized", 401)
    rules = []
    for r in current_app.url_map.iter_rules():
        rules.append({"rule": str(r), "endpoint": r.endpoint, "methods": sorted(list(r.methods))})
    return ok({"routes": rules})
