const fs = require('fs');
const path = require('path');

function findCliRoot() {
  try {
    const p = require.resolve('@expo/cli/package.json');
    return path.dirname(p);
  } catch {
    try {
      const expoPkg = require.resolve('expo/package.json');
      const expoDir = path.dirname(expoPkg);
      return path.join(expoDir, 'node_modules', '@expo', 'cli');
    } catch {
      return null;
    }
  }
}

function findCorsFile(root) {
  if (!root) return null;
  const candidates = [
    path.join(root, 'build', 'src', 'start', 'server', 'middleware', 'CorsMiddleware.js'),
    path.join(root, 'src', 'start', 'server', 'middleware', 'CorsMiddleware.ts'),
  ];
  for (const f of candidates) if (fs.existsSync(f)) return f;
  return null;
}

const cliRoot = findCliRoot();
const target = findCorsFile(cliRoot);

if (!target) {
  console.error('[Nova] Could not locate @expo/cli CorsMiddleware file.');
  process.exit(1);
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

let patched = helper + src.replace(/new\s+URL\s*\(/g, '__novaWrapURL(');

fs.copyFileSync(target, target + '.bak');
fs.writeFileSync(target, patched, 'utf8');
console.log('[Nova] Patched:', target);
