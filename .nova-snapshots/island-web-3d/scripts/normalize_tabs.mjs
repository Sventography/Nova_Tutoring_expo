import fs from 'fs';
import path from 'path';

const TABS_DIR = path.join('app','(tabs)');

function scanFiles(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    if (!fs.existsSync(d)) continue;
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) stack.push(p);
      else if (ent.isFile() && /\.(tsx|ts|jsx|js)$/.test(ent.name)) out.push(p);
    }
  }
  return out;
}

function topSegment(p) {
  const rel = path.relative(TABS_DIR, p).replace(/\\/g,'/');
  const seg = rel.split('/')[0];
  return seg; // e.g. 'account' from 'account.tsx' or 'account/index.tsx'
}

function prefKeep(files) {
  // Prefer 'segment.tsx' over 'segment/index.tsx'
  const byName = Object.fromEntries(files.map(f => [path.basename(f), f]));
  const keep = Object.keys(byName).find(n => !n.includes('/') && n.match(/^[^.]+\.tsx?$/))
           ? byName[Object.keys(byName).find(n => !n.includes('/') && n.match(/^[^.]+\.tsx?$/))]
           : files.find(f => /\/index\.(tsx|ts|jsx|js)$/.test(f)) || files[0];
  return keep;
}

function titleCase(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

if (!fs.existsSync(TABS_DIR)) {
  console.error("Missing tabs dir:", TABS_DIR);
  process.exit(1);
}

const files = scanFiles(TABS_DIR).filter(f => !f.endsWith('/_layout.tsx'));
const bySeg = new Map();
for (const f of files) {
  const seg = topSegment(f);
  if (!bySeg.has(seg)) bySeg.set(seg, []);
  bySeg.get(seg).push(f);
}

const disabledDir = path.join('app','_disabled_tabs_dupes');
fs.mkdirSync(disabledDir, { recursive: true });

for (const [seg, list] of bySeg.entries()) {
  if (list.length <= 1) continue;
  const keep = prefKeep(list);
  for (const f of list) {
    if (f === keep) continue;
    const dst = path.join(disabledDir, path.basename(f) + '.bak');
    fs.renameSync(f, dst);
    console.log('Disabled duplicate for', seg, '→', dst);
  }
}

// Recompute after moving
const uniqSegs = Array.from(new Set(scanFiles(TABS_DIR)
  .filter(f => !f.endsWith('/_layout.tsx'))
  .map(f => topSegment(f)))).sort();

const layout = `import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs initialRouteName="${uniqSegs.includes('account') ? 'account' : (uniqSegs[0] || 'account')}" screenOptions={{ headerShown: false }}>
${uniqSegs.map(s => `      <Tabs.Screen name="${s}" options={{ title: "${titleCase(s)}" }} />`).join('\n')}
    </Tabs>
  );
}
`;
fs.writeFileSync(path.join(TABS_DIR, '_layout.tsx'), layout);
console.log('Wrote clean Tabs layout with screens:', uniqSegs.join(', ') || '(none)');
