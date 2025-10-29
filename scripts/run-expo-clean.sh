#!/usr/bin/env bash
set -euo pipefail

# Nuke the usual culprits from the current shell so Expo can't see them
unset APP_CORS_ALLOWLIST || true
unset FRONTEND_URL || true
unset CORS_ALLOWLIST || true
unset APP_FRONTEND_URL || true
unset FLASK_HOST || true
unset FLASK_PORT || true
unset OPENAI_API_KEY || true
unset STRIPE_SECRET_KEY || true
unset STRIPE_PUBLISHABLE_KEY || true
unset STRIPE_WEBHOOK_SECRET || true
unset GOOGLE_API_KEY || true
unset GOOGLE_CSE_ID || true
unset GOOGLE_KG_API_KEY || true
unset GOOGLE_KG_SEARCH_URL || true

# Print what Expo will see now (sanity check)
node scripts/dump-env.js

# Clean Expo caches and start
npx expo start -c
