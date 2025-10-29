#!/bin/bash
set -e

# kill any old ngrok/background or backend
pkill -f "ngrok http 5050" || true
pkill -f "python backend/app.py" || true

# start ngrok in background
echo "🌐 starting ngrok tunnel..."
ngrok http 5050 > /tmp/ngrok.log 2>&1 &
sleep 3

# fetch ngrok https forwarding url
URL=$(curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[] | select(.proto=="https") | .public_url' | head -n1)

if [ -z "$URL" ]; then
  echo "❌ could not fetch ngrok URL. check ngrok is installed and running."
  exit 1
fi

echo "✅ ngrok URL: $URL"

# update .env with new base url
if grep -q '^NOVA_PUBLIC_BASE_URL=' .env 2>/dev/null; then
  sed -i.bak "s|^NOVA_PUBLIC_BASE_URL=.*|NOVA_PUBLIC_BASE_URL=$URL|" .env
else
  echo "NOVA_PUBLIC_BASE_URL=$URL" >> .env
fi
echo "📦 .env updated with NOVA_PUBLIC_BASE_URL=$URL"

# activate venv and run backend
echo "🚀 starting backend..."
source venv/bin/activate
python backend/app.py
