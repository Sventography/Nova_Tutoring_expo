import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve('app/data/flashcards');
const OUT_FILE = path.resolve('app/_lib/topics-data.json');

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function normalizeCards(cards) {
  if (!Array.isArray(cards)) return [];
  return cards
    .map((c) => {
      // Support {q,a} or {question,answer} or {front,back}
      const q = c?.q ?? c?.question ?? c?.front;
      const a = c?.a ?? c?.answer ?? c?.back;
      if (!q || !a) return null;
      return { question: String(q), answer: String(a) };
    })
    .filter(Boolean);
}

function readTopics() {
  if (!fs.existsSync(SRC_DIR)) return [];
  const files = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.json'));
  const topics = [];

  for (const file of files) {
    const full = path.join(SRC_DIR, file);
    try {
      const raw = JSON.parse(fs.readFileSync(full, 'utf8'));
      const title = String(raw?.topic ?? path.basename(file, '.json'));
      const id = slugify(path.basename(file, '.json'));
      const cards = normalizeCards(raw?.cards ?? []);
      if (cards.length) {
        topics.push({ id, title, cards });
      } else {
        console.warn(`[skip] ${file} has 0 normalized cards`);
      }
    } catch (e) {
      console.warn(`[skip] ${file} parse error:`, e?.message || e);
    }
  }
  return topics;
}

const topics = readTopics().sort((a,b)=> a.title.localeCompare(b.title));

const out = { topics };
fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
console.log(`Wrote ${OUT_FILE} with ${topics.length} topic(s), total cards: ${
  topics.reduce((n,t)=>n+t.cards.length,0)
}`);
