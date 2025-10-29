const fs = require('fs');
const { execSync } = require('child_process');

function findFiles() {
  const patterns = [
    "node_modules/expo/node_modules/@expo/cli/src/start/server/middleware/CorsMiddleware.ts",
    "node_modules/expo/node_modules/@expo/cli/build/src/start/server/middleware/CorsMiddleware.js",
    "node_modules/@expo/cli/src/start/server/middleware/CorsMiddleware.ts",
    "node_modules/@expo/cli/build/src/start/server/middleware/CorsMiddleware.js",
    "node_modules/@expo/cli/build/start/server/middleware/CorsMiddleware.js",
    "node_modules/expo/node_modules/@expo/cli/build/start/server/middleware/CorsMiddleware.js",
  ];
  const found = new Set();
  for (const p of patterns) if (fs.existsSync(p)) found.add(p);
  try {
    const res = execSync(`grep -Rsl --include='CorsMiddleware.*' 'createCorsMiddleware' node_modules`, { stdio: ['ignore','pipe','ignore'] })
      .toString().trim().split('\n').filter(Boolean);
    res.forEach(f => found.add(f));
  } catch {}
  return Array.from(found);
}

function patchFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  if (src.includes('__NovaSafeURL')) {
    console.log(`✓ already patched: ${file}`);
    return;
  }
  const header =
`const __NovaOldURL = typeof URL!=="undefined"?URL:function(u){throw new Error("URL not available")};
function __NovaSafeURL(u){ try{ return new __NovaOldURL(u) } catch(e){ return new __NovaOldURL("http://localhost") } }
`;
  const replaced = header + src.replace(/\bnew\s+URL\(/g, '__NovaSafeURL(');
  fs.copyFileSync(file, file + '.nova.backup');
  fs.writeFileSync(file, replaced, 'utf8');
  console.log(`✓ patched: ${file}`);
}

const files = findFiles();
if (files.length === 0) {
  console.error('✗ Could not find CorsMiddleware.{ts,js} under node_modules.');
  process.exit(1);
}
files.forEach(patchFile);
