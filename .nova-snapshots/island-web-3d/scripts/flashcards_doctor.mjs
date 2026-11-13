import fs from "fs";

function load(p) { try { const m = require(p); return m?.default ?? m; } catch { return null; } }

const index = load("../app/_data/flashcard_index.json") || [];
const byId = load("../app/_data/flashcards_data_by_id.json") || {};
const byTitle = load("../app/_data/flashcards_data.json") || {};

const arg = process.argv[2]; // can be id or title (partial ok)
if (!arg) {
  console.log("Usage: node scripts/flashcards_doctor.mjs <id-or-title-fragment>");
  process.exit(0);
}

const lc = arg.toLowerCase();
const matches = index.filter(t => t.id.toLowerCase().includes(lc) || t.title.toLowerCase().includes(lc));

if (!matches.length) {
  console.log("No topics match:", arg);
  process.exit(0);
}

for (const t of matches) {
  const idArr = Array.isArray(byId[t.id]) ? byId[t.id] : [];
  const titleArr = Array.isArray(byTitle[t.title]) ? byTitle[t.title] : [];
  console.log("—");
  console.log(`Topic: ${t.title}  (id=${t.id}, group=${t.group})`);
  console.log(`Index says count=${t.count} | byId=${idArr.length} | byTitle=${titleArr.length}`);
  const sample = idArr[0] || titleArr[0];
  if (sample) {
    console.log("Sample card keys:", Object.keys(sample));
    console.log("Sample front:", (sample.front ?? sample.question ?? sample.term ?? "").slice(0,120));
    console.log("Sample back :", (sample.back  ?? sample.answer   ?? sample.definition ?? "").slice(0,120));
  } else {
    console.log("No sample card available.");
  }
}
