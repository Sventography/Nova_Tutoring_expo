from __future__ import annotations
import os, json
from pathlib import Path
from flask import Blueprint, request, jsonify, Response

admin_bp = Blueprint("admin_bp", __name__)

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

@admin_bp.get("/admin/orders/log")
def admin_orders_log():
    key = request.headers.get("X-Admin-Key", "")
    if not _admin_key() or key != _admin_key():
        return bad("unauthorized", 401)
    try:
        limit = int(request.args.get("limit", "50"))
        offset = int(request.args.get("offset", "0"))
    except Exception:
        limit, offset = 50, 0
    items = []
    try:
        path = _orders_log_path()
        if path.exists():
            with path.open("r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line: continue
                    try:
                        items.append(json.loads(line))
                    except Exception:
                        pass
        items.sort(key=lambda x: x.get("createdAt", 0), reverse=True)
    except Exception as e:
        return bad(f"log read error: {e}", 500)
    end = offset + limit
    return ok({"orders": items[offset:end], "total": len(items), "offset": offset, "limit": limit})

@admin_bp.get("/admin")
def admin_html():
    key = request.args.get("key") or request.headers.get("X-Admin-Key", "")
    if not _admin_key() or key != _admin_key():
        return bad("unauthorized", 401)
    html = '''<!doctype html>
<meta charset="utf-8">
<title>Nova Admin — Orders</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;background:#0b1220;color:#ecf2ff;margin:0}
  header{padding:16px 20px;border-bottom:1px solid #1f2a44;display:flex;gap:10px;align-items:center}
  h1{margin:0;font-size:18px}
  .bar{margin-left:auto;display:flex;gap:8px}
  input,button,select{background:#0f172a;color:#ecf2ff;border:1px solid #334155;border-radius:8px;padding:8px 10px}
  main{padding:16px}
  table{width:100%;border-collapse:collapse}
  th,td{border-bottom:1px solid #1f2a44;padding:10px 8px;font-size:14px;vertical-align:top}
  tr:hover{background:#0d1b2a}
  .pill{border:1px solid #334155;padding:2px 8px;border-radius:999px;font-size:12px;display:inline-block}
  .mono{font-family:ui-monospace,Menlo,Consolas,monospace}
</style>
<header>
  <h1>Nova Admin — Orders</h1>
  <div class="bar">
    <input id="key" placeholder="Admin key"/>
    <input id="q" placeholder="Search…" style="min-width:220px"/>
    <select id="limit"><option>20</option><option selected>50</option><option>200</option><option>1000</option></select>
    <button id="load">Load</button>
    <button id="export">Export JSON</button>
  </div>
</header>
<main>
  <table id="tbl"><thead><tr>
    <th>When</th><th>Order ID</th><th>Item</th><th>Coins</th><th>Buyer</th><th>Ship To</th><th>Status</th>
  </tr></thead><tbody></tbody></table>
</main>
<script>
const $=s=>document.querySelector(s), key=$("#key"), q=$("#q"), lim=$("#limit"), tbody=$("#tbl tbody");
function fmt(ts){try{return new Date(Number(ts)).toLocaleString()}catch{return String(ts||"")}}
function row(o){const sh=o.shipping||{}, title=o.title||o.sku||"", dest=[sh.address1,sh.address2,(sh.city||"")+" "+(sh.state||"")+" "+(sh.zip||""), sh.country||""].filter(Boolean).join("<br>");
  return `<tr>
    <td class="mono">${fmt(o.createdAt)}</td>
    <td class="mono">${o.id||""}</td>
    <td>${title}<br><span class="mono pill">${o.sku||""}</span></td>
    <td class="mono">${o.priceCoins||""}</td>
    <td>${sh.name||""}<br><span class="mono">${sh.email||""}</span></td>
    <td>${dest}</td>
    <td><span class="pill">${(o.status||"").toUpperCase()}</span></td>
  </tr>`}
function matches(o,qv){if(!qv)return true; qv=qv.toLowerCase(); const sh=o.shipping||{}; const hay=[o.id,o.sku,o.title,o.priceCoins,sh.email,sh.name,sh.city,sh.state,sh.zip,sh.country].join(" ").toLowerCase(); return hay.includes(qv)}
async function load(){
  const res=await fetch(`/admin/orders/log?limit=${Number(lim.value)}`,{headers:{'X-Admin-Key':key.value.trim()}});
  const data=await res.json().catch(()=>({ok:false,error:"Bad JSON"}));
  tbody.innerHTML="";
  if(!data.ok){ tbody.innerHTML=`<tr><td colspan="7">Error: ${data.error||"Unknown"}</td></tr>`; return; }
  const qv=q.value.trim(); (data.orders||[]).filter(o=>matches(o,qv)).forEach(o=>tbody.insertAdjacentHTML("beforeend",row(o)));
}
$("#load").addEventListener("click",load);
key.value=new URLSearchParams(location.search).get("key")||"";
if(key.value) load();
$("#export").addEventListener("click",async()=>{
  const res=await fetch(`/admin/orders/log?limit=${Number(lim.value)}`,{headers:{'X-Admin-Key':key.value.trim()}});
  const data=await res.json();
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="orders.json"; a.click();
});
</script>'''
    return Response(html, mimetype="text/html")
