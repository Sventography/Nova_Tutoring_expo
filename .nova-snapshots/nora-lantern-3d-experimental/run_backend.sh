#!/usr/bin/env bash
set -e
cd ~/Desktop/"Nova_Tutoring_expo 3"/backend
[ -d venv ] || python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install Flask flask-cors python-dotenv stripe
lsof -ti :5050 | xargs kill -9 2>/dev/null || true
export FLASK_APP=app.py
export FLASK_ENV=development
export FLASK_DEBUG=1
export FLASK_RUN_PORT=5050
nohup flask run --port 5050 >/tmp/nova_backend.log 2>&1 &
sleep 2
flask --app app.py routes
curl -s http://127.0.0.1:5050/ping
curl -s http://127.0.0.1:5050/inventory
curl -s -X POST http://127.0.0.1:5050/inventory/purchase -H "Content-Type: application/json" -d '{"item_id":"plushie_nova_devil","qty":1}'
curl -s http://127.0.0.1:5050/inventory/plushie_nova_devil
curl -s -X POST http://127.0.0.1:5050/inventory/refund -H "Content-Type: application/json" -d '{"item_id":"plushie_nova_devil","qty":1}'
curl -s http://127.0.0.1:5050/inventory/plushie_nova_devil
curl -s -X POST http://127.0.0.1:5050/stripe/create-payment-intent -H "Content-Type: application/json" -d '{"pack_id":"coins_1000","user_id":"test_user"}'
