// scripts/fix_import_paths.mjs
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "app");

const exts = new Set([".ts", ".tsx", ".js", ".jsx"]);
const changes = [
  // collections
  { from: /(['"])..\/utils\/collections\1/g, to: "'@/lib/collections'" },
  { from: /(['"]).\/utils\/collections\1/g,  to: "'@/lib/collections'" },
  { from: /(['"])@\/utils\/collections\1/g,  to: "'@/lib/collections'" },
  // cert_store
  { from: /(['"])..\/utils\/cert_store\1/g,  to: "'@/lib/certificates'" },
  { from: /(['"]).\/utils\/cert_store\1/g,   to: "'@/lib/certificates'" },
  { from: /(['"])@\/utils\/cert_store\1/g,   to: "'@/lib/certificates'" },
];

let edited = 0;
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules") continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) { walk(p); continue; }
    if (!exts.has(path.extname(name))) continue;

    let txt = fs.readFileSync(p, "utf8");
    let out = txt;
    for (const { from, to } of changes) out = out.replace(from, to);
    if (out !== txt) {
      fs.writeFileSync(p, out);
      console.log("updated:", p);
      edited++;
    }
  }
}
walk(DIR);
console.log(edited ? `✅ rewrote ${edited} file(s)` : "✅ nothing to change");

