import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const CANDIDATES = [
  path.join(ROOT, "app", "data", "quiz"),
  path.join(ROOT, "app", "data", "quizzes"),
];
const OUT_DIR = path.join(ROOT, "app", "_data");
const BANK = path.join(OUT_DIR, "quiz_bank.json");
const INDEX= path.join(OUT_DIR, "quiz_index.json");

function firstExisting(dirs){ for (const d of dirs) if (fs.existsSync(d)) return d; return null; }
function readJson(p){ try{ return JSON.parse(fs.readFileSync(p,"utf8")); } catch { return null; } }
function toArray(x){
  if (!x) return [];
  if (Array.isArray(x)) return x;
  for (const k of ["questions","data","items","rows"]) if (Array.isArray(x?.[k])) return x[k];
  if (typeof x === "object") return Object.values(x);
  return [];
}
function normalize(q, i, topic){
  const question = (q?.q ?? q?.question ?? "").toString().trim();
  const correct  = (q?.a ?? q?.answer ?? q?.correct ?? "").toString().trim();
  let choices = q?.choices ?? q?.options ?? q?.answers ?? [];
  if (!Array.isArray(choices) || choices.length === 0) {
    choices = Array.from(new Set([correct, "A", "B", "C"])).slice(0,4);
  }
  choices = choices.map(String);
  if (!question || !correct) return null;
  return { id:`${topic}:${i}`, topic, question, choices, correct };
}

const SRC = firstExisting(CANDIDATES);
if (!SRC) { console.warn("No quiz folder found at", CANDIDATES.join(" or "), "— skipping."); process.exit(0); }

const files = fs.readdirSync(SRC).filter(f => f.endsWith(".json") && !f.startsWith("_"));
const bank = [], index = [];
for (const f of files) {
  const topic = f.replace(/\.json$/,"");
  const js = readJson(path.join(SRC, f));
  const arr = toArray(js);
  const mapped = arr.map((q,i)=>normalize(q,i,topic)).filter(Boolean);
  bank.push(...mapped);
  index.push({ id: topic, title: topic.replace(/[_-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase()), count: mapped.length });
}
index.sort((a,b)=>a.title.localeCompare(b.title));
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(BANK,  JSON.stringify(bank,  null, 2));
fs.writeFileSync(INDEX, JSON.stringify(index, null, 2));
console.log("✅ Built", path.relative(ROOT, BANK), "and", path.relative(ROOT, INDEX));
