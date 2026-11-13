import re, sys, pathlib

p = pathlib.Path("server/app.py")
src = p.read_text(encoding="utf-8")

changed = False

# 1) Ensure import exists near the top
imp = "from coins_orders import coins_bp"
if imp not in src:
    # insert after any shebang/encoding line
    m = re.search(r"^(?:#!.*\n)?(?:#.*coding[:=].*\n)?", src, flags=re.M)
    pos = m.end() if m else 0
    src = src[:pos] + imp + "\n" + src[pos:]
    changed = True

# 2) Ensure registration after the first app = Flask(...)
reg_line = "app.register_blueprint(coins_bp)"
if reg_line not in src:
    m = re.search(r"^\s*app\s*=\s*Flask\([^)]*\).*$", src, flags=re.M)
    if not m:
        print("Could not find `app = Flask(...)` in server/app.py. Please add this after app creation:")
        print("    app.register_blueprint(coins_bp)")
        sys.exit(1)
    insert_at = m.end()
    src = src[:insert_at] + "\n" + reg_line + "\n" + src[insert_at:]
    changed = True

if changed:
    p.write_text(src, encoding="utf-8")
    print("Patched server/app.py ✅")
else:
    print("server/app.py already configured ✅")
