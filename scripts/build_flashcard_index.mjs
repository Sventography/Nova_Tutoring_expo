import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "app", "data", "flashcards");
const OUT_DIR = path.join(ROOT, "app", "_data");
const INDEX = path.join(OUT_DIR, "flashcard_index.json");
const DATA = path.join(OUT_DIR, "flashcards_data.json");

function readJson(p){ try{ return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }
function titleize(s){ return s.replace(/[_-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase()).trim(); }
function toArray(x){
  if (!x) return [];
  if (Array.isArray(x)) return x;
  for (const k of ["cards","data","flashcards","items","rows"]) if (Array.isArray(x?.[k])) return x[k];
  if (typeof x === "object") return Object.values(x);
  return [];
}
function normalize(c, i, id){
  const q = (c?.q ?? c?.front ?? c?.question ?? "").toString().trim();
  const a = (c?.a ?? c?.back  ?? c?.answer   ?? "").toString().trim();
  return (q && a) ? { id:`${id}:${i}`, q, a } : null;
}

if (!fs.existsSync(SRC_DIR)) {
  console.warn("No flashcards folder at", SRC_DIR, "— skipping.");
  process.exit(0);
}

const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith(".json") && !f.startsWith("_"));
const outData = {};
const outIndex = [];

for (const file of files) {
  const id = file.replace(/\.json$/,"");
  const js = readJson(path.join(SRC_DIR, file));
  const arr = toArray(js);
  const mapped = arr.map((c,i)=>normalize(c,i,id)).filter(Boolean);
  outData[id] = mapped;
  outIndex.push({ id, title: titleize(id), group: "General", count: mapped.length });
}

outIndex.sort((a,b)=>a.title.localeCompare(b.title));
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(DATA,  JSON.stringify(outData,  null, 2));
fs.writeFileSync(INDEX, JSON.stringify(outIndex, null, 2));
console.log("✅ Built", path.relative(ROOT, DATA), "and", path.relative(ROOT, INDEX));
