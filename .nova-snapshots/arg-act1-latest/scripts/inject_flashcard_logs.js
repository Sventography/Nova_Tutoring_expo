/**
 * Injects console.log lines right before `setCards(list);`
 * inside app/tabs/flashcards.tsx, so we can see what keys exist
 * in DATA_MAP and what topic we're trying to load.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(process.cwd(), 'app', 'tabs', 'flashcards.tsx');

if (!fs.existsSync(FILE)) {
  console.error('❌ Could not find', FILE);
  process.exit(1);
}

// backup
const bak = FILE + '.bak.' + Date.now();
fs.copyFileSync(FILE, bak);

let s = fs.readFileSync(FILE, 'utf8');

// inject logs before the first occurrence of setCards(list);
const needle = 'setCards(list);';
if (!s.includes(needle)) {
  console.error('❌ Could not find `' + needle + '` in', FILE);
  console.error('   Open the file and tell me what line sets the cards.');
  process.exit(2);
}

const logs = [
  'console.log("Some DATA_MAP keys:", Object.keys(DATA_MAP || {}).slice(0, 10));',
  'console.log("Looking for topic.id:", topic?.id, "topic.title:", topic?.title);',
  'console.log("Matched array length:", Array.isArray(list) ? list.length : -1);',
].join('\n');

s = s.replace(needle, logs + '\n' + needle);

fs.writeFileSync(FILE, s);
console.log('✅ Injected debug logs into', FILE);
console.log('   Backup saved at', bak);
