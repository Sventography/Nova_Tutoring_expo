const fs = require('fs');
const path = require('path');

function findCliRoots() {
  const roots = [];
  try { roots.push(path.dirname(require.resolve('@expo/cli/package.json'))); } catch {}
  try { const expoDir = path.dirname(require.resolve('expo/package.json')); 
        const alt = path.join(expoDir, 'node_modules', '@expo', 'cli');
        if (fs.existsSync(alt)) roots.push(alt); } catch {}
  return roots;
}

function findCorsFile(root) {
  const candidates = [
    path.join(root, 'src', 'start', 'server', 'middleware', 'CorsMiddleware.ts'),
    path.join(root, 'build', 'src', 'start', 'server', 'middleware', 'CorsMiddleware.js'),
  ];
  for (const f of candidates) if (fs.existsSync(f)) return f;
  return null;
}

let target = null;
for (const r of findCliRoots()) {
  const f = findCorsFile(r);
  if (f) { target = f; break; }
}
if (!target) {
  console.error('[Nova] Could not locate CorsMiddleware.{ts,js}');
  process.exit(0); // non-fatal: we'll rely on NODE_OPTIONS shim
}

let src = fs.readFileSync(target, 'utf8');
if (src.includes('__novaWrapURL(')) {
  console.log('[Nova] Already patched:', target);
  process.exit(0);
}

const helper = `
// === Nova patch: tolerate invalid/empty URL values ===
function __novaWrapURL(val){ try{ return new URL(val); } catch(e){ return new URL('http://localhost'); } }
`;

let patched = src;
// Prefer minimal, safe replace only at call-sites
patched = patched.replace(/new\\s+URL\\s*\\(/g, '__novaWrapURL(');

// Prepend helper
patched = helper + patched;

fs.copyFileSync(target, target + '.bak');
fs.writeFileSync(target, patched, 'utf8');
console.log('[Nova] Patched:', target);
