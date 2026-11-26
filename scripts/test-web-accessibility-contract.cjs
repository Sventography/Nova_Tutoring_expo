// Source contract checks; browser axe and native accessibility tests still required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const html = read('app/+html.tsx');
const header = read('app/components/HeaderBar.tsx');
assert.match(html, /<html lang="en">/);
assert.match(html, /<title>Nova Tutoring<\/title>/);
assert.match(html, /<ScrollViewStyleReset\s*\/>/);
assert.match(header, /accessibilityLabel=\{\x60\$\{name\} \$\{displayCoins\.toLocaleString\(\)\} Nova Coins, open account\x60\}/);
assert.match(header, /aria-hidden=\{true\}/);
assert.match(header, /<\/Pressable>\s*\{isLoggedIn && \(/);
assert.match(header, /accessibilityLabel=\{\x60\$\{safeStreakCount\} day streak, check in today\x60\}/);
assert.doesNotMatch(header, /\[HeaderBar\] user from context/);
console.log('Accessibility source contract checks passed');
