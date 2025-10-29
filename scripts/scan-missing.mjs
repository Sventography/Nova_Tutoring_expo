import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname, resolve } from "path";

const root = process.cwd();
const appDir = join(root, "app");
const shouldCreate = process.argv.includes("--create");

function walk(dir) {
  const out = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx|js|jsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}

const files = walk(appDir);
const importRe = /import\s+(?:type\s+)?(?:(\w+)\s*,\s*)?(?:\*\s+as\s+(\w+)\s*,\s*)?(?:\*\s+as\s+(\w+)|\{([^}]+)\})?\s*from\s*['"]([^'"]+)['"]/g;

const missing = new Map();

for (const file of files) {
  const src = readFileSync(file, "utf8");
  let m;
  while ((m = importRe.exec(src))) {
    const def = m[1] || null;
    const star = m[2] || m[3] || null;
    const namedBlock = m[4] || "";
    const spec = m[5];

    if (!spec.includes("/utils/")) continue;

    let rel = spec;
    if (spec.startsWith("@/")) rel = spec.slice(2);
    const base = spec.startsWith("@/") ? join(root, rel) : resolve(dirname(file), rel);

    const candidates = [base + ".ts", base + ".tsx", join(base, "index.ts"), join(base, "index.tsx")];
    const exists = candidates.some(existsSync);
    if (exists) continue;

    const info = missing.get(base) || { default: false, star: false, named: new Set() };
    if (def) info.default = true;
    if (star) info.star = true;

    if (namedBlock) {
      for (const part of namedBlock.split(",").map(s => s.trim()).filter(Boolean)) {
        const name = part.split(/\s+as\s+/)[0].trim();
        if (name) info.named.add(name);
      }
    }
    missing.set(base, info);
  }
}

const list = [...missing.entries()];
if (!list.length) {
  console.log("OK: no missing utils imports");
  process.exit(0);
}

for (const [base, info] of list) {
  const target = base + ".ts";
  console.log("MISSING", target);
  if (shouldCreate) {
    mkdirSync(dirname(target), { recursive: true });
    const namedFns = [...info.named].map(n => `export function ${n}(...args:any[]): any { return undefined as any }`).join("\n");
    const def = info.default || info.star
      ? "const _default:any = new Proxy({}, { get(){ return () => undefined; } }); export default _default;"
      : "export default {};";
    writeFileSync(target, (namedFns ? namedFns + "\n" : "") + def + "\n");
    console.log("CREATED", target);
  }
}
