import fs from 'fs';
const askPath = 'app/(tabs)/ask.tsx';
if (!fs.existsSync(askPath)) { console.error('MISSING '+askPath); process.exit(1); }
let s = fs.readFileSync(askPath,'utf8');
const re = /from\s+['"]\.\.\/\.\.\/_lib\/hooks\/useNovaAchievements['"]/g;
const out = s.replace(re, 'from "../_lib/hooks/useNovaAchievements"');
if (out !== s) { fs.writeFileSync(askPath, out); console.log('Patched:', askPath); }
else { console.log('No change needed:', askPath); }
