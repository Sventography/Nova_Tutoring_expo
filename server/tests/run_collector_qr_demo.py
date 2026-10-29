"""Scan-to-claim QR demo using disposable local PostgreSQL and synthetic accounts.

NOT a production collector service, Auth integration, or app entitlement grant.
Starts a temporary Docker PostgreSQL container, applies the exact private SQL
migrations, seeds two disposable Auth-user rows and two random QR codes, and
runs the REAL collector Flask routes. A separate local-only HTML page allows
iPhone-camera QR scanning and fake Alice/Bob account switching.

Usage from repo root, with Docker Desktop / OrbStack running and phone on Wi-Fi:
    python -m pip install "Flask>=3,<4" "psycopg[binary]==3.2.10" "qrcode==8.2"
    python server/tests/run_collector_qr_demo.py

If network detection picks the wrong address, set your Mac's *private* Wi-Fi IP:
    python server/tests/run_collector_qr_demo.py --host-ip 192.168.1.20

Visit the printed /stage URL on Mac, scan the 017 test QR on the phone,
select Test Owner A, verify, claim, then switch to Test Owner B.
Ctrl+C stops Flask and REMOVES the disposable database.

NEVER use Supabase production project IDs, real user tokens, staging secrets,
actual physical QR codes, or public tunnels with this demo. This is local-only.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import html
import ipaddress
import io
import os
from pathlib import Path
import secrets
import signal
import socket
import sys
import uuid
from urllib.parse import quote
from unittest.mock import patch

try:
    from flask import Flask, jsonify, redirect, request, Response
    import psycopg
    import qrcode
    from qrcode.image.svg import SvgPathImage
except ImportError as exc:
    raise SystemExit(
        'Install Flask, psycopg and QR renderer in the active virtualenv: '
        'python -m pip install "Flask>=3,<4" "psycopg[binary]==3.2.10" "qrcode==8.2"'
    ) from exc

from run_collector_postgres_staging import (
    docker, install_original_sql, launch_temporary_database,
)

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from collector_redemption import register_collector_routes  # noqa: E402

REWARD = "noras_last_lantern_017"
REAL_CONNECT = psycopg.connect


def private_wifi_ip(value: str) -> str:
    """Never create a scannable demo URL pointing to a public Internet host."""
    try:
        address = ipaddress.IPv4Address(value)
    except ipaddress.AddressValueError as exc:
        raise ValueError("Use a private IPv4 address from your Mac's Wi-Fi settings.") from exc
    allowed = (
        ipaddress.ip_network("10.0.0.0/8"),
        ipaddress.ip_network("172.16.0.0/12"),
        ipaddress.ip_network("192.168.0.0/16"),
    )
    if not any(address in network for network in allowed):
        raise ValueError(
            "QR demo requires a private Wi-Fi IPv4 address (10.x, 172.16-31.x, 192.168.x). "
            "Do not use a public address or tunnel."
        )
    return str(address)


def detect_wifi_ip() -> str:
    """Find an outbound local-interface IP without actually sending packets."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("192.0.2.1", 9))
            detected = sock.getsockname()[0]
            return private_wifi_ip(detected)
    except (OSError, ValueError) as exc:
        raise RuntimeError(
            "Could not select a private network address. Run with "
            "--host-ip <your Mac's Wi-Fi IPv4 address>."
        ) from exc


def fake_svg_qr(url: str) -> str:
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M,
                       box_size=10, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    out = io.BytesIO()
    qr.make_image(image_factory=SvgPathImage).save(out)
    return "data:image/svg+xml;base64," + base64.b64encode(out.getvalue()).decode("ascii")


def make_demo_app(*, database_url: str, public_ip: str, port: int):
    """Create an isolated Flask app using only synthetic accounts and tokens."""
    app = Flask("nova_collector_qr_local_only")
    app.config["MAX_CONTENT_LENGTH"] = 2048

    alice, bob = str(uuid.uuid4()), str(uuid.uuid4())
    tokens = {
        "alice": secrets.token_urlsafe(40),
        "bob": secrets.token_urlsafe(40),
    }
    identities = {tokens["alice"]: alice, tokens["bob"]: bob}
    codes = {17: secrets.token_urlsafe(32), 23: secrets.token_urlsafe(32)}
    with REAL_CONNECT(database_url, sslmode="disable") as conn:
        with conn.cursor() as cur:
            cur.execute("INSERT INTO auth.users(id) VALUES (%s::uuid), (%s::uuid)", (alice, bob))
            for serial, code in codes.items():
                cur.execute(
                    """INSERT INTO collector_private.plushie_codes
                       (edition, serial_number, code_hash)
                       VALUES ('noras_last_lantern', %s, %s)""",
                    (serial, hashlib.sha256(code.encode("utf-8")).hexdigest()),
                )

    def extract_bearer():
        header = request.headers.get("Authorization", "")
        return header[7:] if header.startswith("Bearer ") else None

    def fake_verify_access_token(token):
        user = identities.get(token)
        return {"id": user} if user is not None else None

    register_collector_routes(
        app, extract_bearer_token=extract_bearer,
        verify_access_token=fake_verify_access_token,
    )

    allowed_hosts = {
        f"{public_ip}:{port}", f"127.0.0.1:{port}", f"localhost:{port}"
    }

    @app.before_request
    def local_only_host():
        # Guard against accidental public reverse proxies / custom Hostnames.
        if request.host not in allowed_hosts:
            return jsonify(ok=False, error="local_staging_only"), 403

    @app.after_request
    def no_staging_cache(response):
        response.headers["Cache-Control"] = "private, no-store"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Robots-Tag"] = "noindex, nofollow, noarchive"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    links = {
        serial: f"http://{public_ip}:{port}/collector#code={quote(code, safe='')}"
        for serial, code in codes.items()
    }
    markup = (HERE / "collector_qr_demo.html").read_text(encoding="utf-8")
    markup = (
        markup
        .replace("__QR_017__", fake_svg_qr(links[17]))
        .replace("__QR_023__", fake_svg_qr(links[23]))
        .replace("__LINK_017__", html.escape(links[17], quote=True))
        .replace("__LINK_023__", html.escape(links[23], quote=True))
        .replace("<script>\n(function() {",
                 "<script>window.__NOVA_LOCAL_COLLECTOR_STAGE__ = true;</script>\n"
                 "<script>\n(function() {")
    )

    @app.get("/")
    def home():
        return redirect("/stage", code=302)

    @app.get("/stage")
    @app.get("/collector")
    def collector_ui():
        return Response(markup, mimetype="text/html")

    @app.post("/demo/login")
    def synthetic_login():
        if not request.is_json or not isinstance(request.get_json(silent=True), dict):
            return jsonify(ok=False, error="invalid_request"), 400
        body = request.get_json(silent=True)
        identity = body.get("identity")
        if not isinstance(identity, str) or identity not in tokens:
            return jsonify(ok=False, error="invalid_test_identity"), 400
        return jsonify(ok=True, token=tokens[identity], identity=identity, mode="synthetic")

    return app


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Temporary LAN-only QR demo; never uses live collector codes or accounts."
    )
    parser.add_argument(
        "--host-ip", default=None,
        help="Your Mac's private Wi-Fi IPv4 address (default: auto-detect)."
    )
    parser.add_argument(
        "--port", type=int, default=5057, help="Local test HTTP port (default: 5057)."
    )
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error("--port must be between 1024 and 65535.")
    try:
        local_ip = private_wifi_ip(args.host_ip) if args.host_ip else detect_wifi_ip()
    except (ValueError, RuntimeError) as exc:
        parser.error(str(exc))

    # Refuse commonly leaked / live-looking configuration at launch. The actual
    # database connection is ALWAYS a freshly created disposable Docker DSN.
    if os.environ.get("COLLECTOR_DATABASE_URL"):
        print("[collector-qr] Ignoring existing COLLECTOR_DATABASE_URL: "
              "this demo only uses its own disposable Docker database.")
    name = None
    print("[collector-qr] Starting temporary, localhost-only PostgreSQL...")
    try:
        name, db_url = launch_temporary_database()
        install_original_sql(db_url)
        app = make_demo_app(database_url=db_url, public_ip=local_ip, port=args.port)

        def local_only_connect(conninfo, **kwargs):
            if conninfo != db_url:
                raise AssertionError("Collector QR demo refused a non-disposable DB connection.")
            if kwargs.get("sslmode") != "require" or kwargs.get("connect_timeout") != 8:
                raise AssertionError("Production collector connection contract changed.")
            return REAL_CONNECT(conninfo, **{**kwargs, "sslmode": "disable"})

        # Test-only bridge: local vanilla Postgres has no TLS, production remains
        # sslmode=require. This patch lives only while this script is running.
        with patch.dict(os.environ, {
            "COLLECTOR_DATABASE_URL": db_url,
            "COLLECTOR_REDEMPTION_ENABLED": "true",
        }), patch.object(psycopg, "connect", side_effect=local_only_connect):
            print("\n" + "=" * 66)
            print("  NOVA//ARCHIVE — ISOLATED QR TEST, NOT PRODUCTION")
            print(f"  Open on Mac:  http://{local_ip}:{args.port}/stage")
            print("  Scan the QR displayed there with your iPhone camera.")
            print("  Use Test Owner A to claim and Test Owner B to check rejection.")
            print("  Stop with Control+C. The temporary database will be deleted.")
            print("=" * 66 + "\n")
            app.run(host="0.0.0.0", port=args.port, debug=False, use_reloader=False,
                    threaded=True)
        return 0
    except KeyboardInterrupt:
        print("\n[collector-qr] Shutting down the local staging demo.")
        return 0
    except Exception as exc:
        print(f"[collector-qr] Failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    finally:
        if name:
            docker("stop", "--time", "0", name, check=False)
            print("[collector-qr] Disposable Postgres removed. No production changes.")


if __name__ == "__main__":
    # SIGTERM should still unwind 'finally' (e.g., IDE stop button).
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
    raise SystemExit(main())
