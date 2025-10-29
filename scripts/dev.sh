#!/usr/bin/env bash
set -euo pipefail

# --------------------------
# Nova "just works" dev runner
# - Cleans up old processes on :5050
# - Creates/uses Python venv at server/.venv if available
# - Installs backend deps (once) from server/requirements.txt (or fallback)
# - Starts Flask backend, waits for health
# - Starts ngrok if available; else falls back to local URL
# - Writes .env.development with API URL
# - Starts Expo in the foreground
# - Cleans up backend on exit
# --------------------------

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_DIR="$ROOT_DIR/server"
VENV_DIR="$SERVER_DIR/.venv"
ACTIVATE="$VENV_DIR/bin/activate"
LOG_FLASK="/tmp/nova_flask.log"
LOG_NGROK="/tmp/nova_ngrok.log"
HEALTH_PATH="/api/health"
PORT="5050"
LOCAL_URL="http://127.0.0.1:${PORT}"

cd "$ROOT_DIR"

echo "🧹 Killing leftovers on :${PORT} and any previous ngrok/server.py…"
pkill -f "ngrok http" 2>/dev/null || true
pkill -f server.py 2>/dev/null || true
lsof -ti :"${PORT}" | xargs kill -9 2>/dev/null || true

echo "💠 Nova Dev: starting…"

# --- Python / venv setup (optional) ---
USE_VENV=0
if command -v python3 >/dev/null 2>&1; then
  if [ ! -d "$VENV_DIR" ]; then
    echo "📦 Creating Python venv at server/.venv …"
    python3 -m venv "$VENV_DIR" || echo "⚠️ Couldn't create venv; will try system Python."
  fi
  if [ -f "$ACTIVATE" ]; then
    echo "🧪 Activating server/.venv …"
    # shellcheck disable=SC1090
    source "$ACTIVATE"
    USE_VENV=1
  else
    echo "⚠️ venv not found; using system Python."
  fi
else
  echo "⚠️ python3 not found; backend will only run if 'python3' works."
fi

# --- Install backend deps (only if requirements.txt exists and not yet installed) ---
if [ -d "$SERVER_DIR" ] && [ -f "$SERVER_DIR/server.py" ]; then
  if command -v python3 >/dev/null 2>&1; then
    if [ -f "$SERVER_DIR/requirements.txt" ]; then
      # Install only once per venv or when requirements.txt changes
      REQ_HASH_FILE="$VENV_DIR/.requirements.hash"
      CUR_HASH="$(shasum -a 256 "$SERVER_DIR/requirements.txt" 2>/dev/null | awk '{print $1}')"
      OLD_HASH="$(cat "$REQ_HASH_FILE" 2>/dev/null || true)"
      if [ "$CUR_HASH" != "$OLD_HASH" ]; then
        echo "📥 Installing backend requirements …"
        pip install --upgrade pip >/dev/null 2>&1 || true
        pip install -r "$SERVER_DIR/requirements.txt" || true
        mkdir -p "$VENV_DIR"
        echo "$CUR_HASH" > "$REQ_HASH_FILE"
      else
        echo "✅ Backend requirements already installed."
      fi
    else
      echo "ℹ️ No requirements.txt; ensuring minimal deps …"
      pip install --upgrade pip >/dev/null 2>&1 || true
      pip install flask flask-cors openai >/dev/null 2>&1 || true
    fi
  fi
else
  echo "ℹ️ No backend found at server/server.py — skipping backend start."
fi

# --- Start backend (if present) ---
SERVER_PID=""
if [ -d "$SERVER_DIR" ] && [ -f "$SERVER_DIR/server.py" ]; then
  echo "🚀 Starting Flask backend on :${PORT} … (logs: $LOG_FLASK)"
  ( cd "$SERVER_DIR" && python3 server.py ) > "$LOG_FLASK" 2>&1 &
  SERVER_PID=$!
  echo "🔧 Backend PID: $SERVER_PID"

  echo "⏳ Waiting for Flask health (${HEALTH_PATH}) …"
  ATTEMPTS=0
  until curl -sf "${LOCAL_URL}${HEALTH_PATH}" >/dev/null 2>&1; do
    ATTEMPTS=$((ATTEMPTS+1))
    sleep 0.3
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
      echo "❌ Flask crashed; last 60 log lines:"
      tail -n 60 "$LOG_FLASK"
      exit 1
    fi
    if [ $ATTEMPTS -gt 200 ]; then
      echo "❌ Flask didn't become healthy. Log tail:"
      tail -n 60 "$LOG_FLASK"
      exit 1
    fi
  done
  echo "✅ Flask is up at ${LOCAL_URL}"
else
  echo "ℹ️ Backend skipped; using local URL anyway."
fi

# --- Start ngrok if available; else use local URL ---
PUBLIC_URL=""
if command -v ngrok >/dev/null 2>&1; then
  echo "🌐 Starting ngrok tunnel … (logs: $LOG_NGROK)"
  ngrok http "${PORT}" --log=stdout > "$LOG_NGROK" 2>&1 &
  # wait for ngrok API to be ready on :4040
  ATTEMPTS=0
  until curl -sf "http://127.0.0.1:4040/api/tunnels" >/dev/null 2>&1; do
    ATTEMPTS=$((ATTEMPTS+1))
    sleep 0.3
    [ $ATTEMPTS -gt 200 ] && break
  done
  # read URL
  PUBLIC_URL="$(curl -s http://127.0.0.1:4040/api/tunnels | grep -o 'https://[a-zA-Z0-9.-]*ngrok-free.app' | head -n1 || true)"
  if [ -n "$PUBLIC_URL" ]; then
    echo "✅ ngrok up: $PUBLIC_URL"
  else
    echo "⚠️ ngrok did not produce a public URL; falling back to local."
  fi
else
  echo "ℹ️ ngrok not installed; using local URL."
fi

API_URL="${PUBLIC_URL:-$LOCAL_URL}"
printf 'EXPO_PUBLIC_API_URL=%s\n' "$API_URL" > .env.development
echo "💚 env wired to: $(cat .env.development)"

# Open health in Safari (best effort)
if [ -n "$API_URL" ]; then
  echo "🧪 opening health check in Safari…"
  open -a Safari "${API_URL}${HEALTH_PATH}" 2>/dev/null || true
fi

# Clean Expo cache directory (keep node_modules intact)
echo "🧼 Clearing Expo cache dir …"
rm -rf .expo .expo-shared 2>/dev/null || true

# --- Cleanup on exit ---
cleanup() {
  if [ -n "${SERVER_PID:-}" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    echo ""
    echo "🧹 Stopping backend (PID $SERVER_PID)…"
    kill "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# --- Start Expo in foreground ---
echo "📱 Starting Expo …"
npx expo start -c

