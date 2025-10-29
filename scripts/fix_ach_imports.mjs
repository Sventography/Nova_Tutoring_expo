import fs from 'fs';
import path from 'path';

const ROOT = 'app';
const TARGET = path.join(ROOT, '_lib', 'hooks', 'useNovaAchievements');

function listFiles(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) stack.push(p);
      else if (ent.isFile() && /\.(tsx|ts|jsx|js)$/.test(ent.name)) out.push(p);
    }
  }
  return out;
}

const files = listFiles(ROOT);
let changed = 0;

for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  if (!/useNovaAchievements/.test(s)) continue;

  const rel = path.relative(path.dirname(f), TARGET).replace(/\\/g, '/');
  const desired = `from "${rel}"`;

  const re = /from\s+['"][^'"]*useNovaAchievements['"]/g;
  const out = s.replace(re, desired);

  if (out !== s) {
    fs.writeFileSync(f, out);
    console.log('Patched', f, '→', desired);
    changed++;
  }
}

if (!changed) {
  console.log('No files needed patching.');
}
