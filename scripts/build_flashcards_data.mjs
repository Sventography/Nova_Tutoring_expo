import fs from "fs";
import path from "path";

const OUT_DIR = path.resolve("app/_data");
const OUT_INDEX = path.join(OUT_DIR, "flashcard_index.json");
const OUT_DATA  = path.join(OUT_DIR, "flashcards_data.json");

// Accept multiple shapes → { q, a, choices? }
function toQA(obj) {
  const q = obj?.q ?? obj?.front ?? obj?.term ?? obj?.prompt ?? "";
  const a = obj?.a ?? obj?.back ?? obj?.definition ?? obj?.answer ?? "";
  const choices = Array.isArray(obj?.choices) ? obj.choices : undefined;
  return { q: String(q), a: String(a), ...(choices ? { choices } : {}) };
}

function titleFrom(file, json) {
  const t = json?.title || json?.name || json?.topic;
  if (typeof t === "string" && t.trim()) return t.trim();
  const base = path.basename(file, path.extname(file));
  return base
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}
function slug(s) {
  return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
}

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}

function listJSONFiles(root) {
  const out = [];
  (function walk(dir){
    let ents=[];
    try { ents = fs.readdirSync(dir, { withFileTypes:true }); } catch { return; }
    for (const e of ents) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && e.name.toLowerCase().endsWith(".json")) out.push(p);
    }
  })(root);
  return out;
}

function normalizeQAContainer(j) {
  if (!j) return [];
  const arr =
    Array.isArray(j) ? j :
    Array.isArray(j?.cards) ? j.cards :
    Array.isArray(j?.questions) ? j.questions :
    Array.isArray(j?.items) ? j.items :
    [];
  return arr.map(toQA).filter(x => x.q && x.a);
}

function main() {
  const root = process.env.TOPIC_DIR;
  if (!root) {
    console.error("Please provide TOPIC_DIR=/path/to/your/topics (folder containing the 203 JSONs).");
    process.exit(2);
  }
  const files = listJSONFiles(path.resolve(root));
  if (!files.length) {
    console.error("No JSON files found under:", root);
    process.exit(3);
  }

  const byTitle = {};
  for (const file of files) {
    const j = readJSON(file);
    if (!j) continue;
    const title = titleFrom(file, j);
    const qa = normalizeQAContainer(j);
    if (!qa.length) continue;
    (byTitle[title] ||= []).push(...qa);
  }

  const index = Object.keys(byTitle)
    .sort((a,b)=>a.localeCompare(b))
    .map(title => ({ id: slug(title), title, group: "mixed", count: byTitle[title].length }));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_INDEX, JSON.stringify(index, null, 2), "utf8");
  fs.writeFileSync(OUT_DATA, JSON.stringify(byTitle, null, 2), "utf8");

  // helpful console info
  const total = index.length;
  const not20 = index.filter(t => t.count !== 20).length;
  console.log(`✓ Wrote ${OUT_INDEX} and ${OUT_DATA}`);
  console.log(`✓ Topics: ${total}  |  with !=20 cards: ${not20}`);
}
main();
