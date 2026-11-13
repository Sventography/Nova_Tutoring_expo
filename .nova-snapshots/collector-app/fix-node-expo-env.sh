set -euo pipefail

echo "▶️ Checking Xcode Command Line Tools…"
xcode-select -p >/dev/null 2>&1 || { xcode-select --install || true; }

echo "▶️ Installing Homebrew (if missing)…"
if ! command -v brew >/dev/null 2>&1; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
  eval "$(/opt/homebrew/bin/brew shellenv)"
fi

echo "▶️ Installing NVM (Node Version Manager) if missing…"
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi

# Load NVM for this shell and future shells
. "$NVM_DIR/nvm.sh"
grep -q 'NVM_DIR' ~/.zshrc || cat >> ~/.zshrc <<'EOF'

# NVM (Node Version Manager)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
EOF

echo "▶️ Installing & using latest LTS Node…"
nvm install --lts >/dev/null
nvm use --lts

echo "✅ Versions:"
node -v
npm -v

echo "▶️ Enabling corepack (yarn/pnpm shims)…"
corepack enable || true

echo "▶️ Installing project deps…"
if [ ! -f package.json ]; then
  echo "❌ Not in a project folder. cd to your app root (where package.json lives) and rerun: ./fix-node-expo-env.sh"
  exit 1
fi

# Clean & install
rm -rf node_modules
rm -f package-lock.json yarn.lock
npm install

echo "▶️ Starting Expo (clearing cache)…"
npx expo start -c
