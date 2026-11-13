/**
 * Build app/data/_gen/flashcards.gen.ts from app/data/flashcards/*.json
 * - Skips files that start with "_" (e.g. _topics_alias.json)
 * - Uses "topic" and "cards" from each JSON file
 * - Optional grouping via app/data/flashcards/_topics_alias.json
 */
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "app", "data", "flashcards");
const OUT_DIR = path.join(ROOT, "app", "data", "_gen");
const OUT_FILE = path.join(OUT_DIR, "flashcards.gen.ts");
const ALIAS_FILE = path.join(SRC_DIR, "_topics_alias.json");

function loadAliases() {
  try {
    const txt = fs.readFileSync(ALIAS_FILE, "utf8");
    const obj = JSON.parse(txt);
    // Expected shape: { "<Title>": { title?: string, group?: string } }
    return obj || {};
  } catch {
    return {};
  }
}

function guessGroup(title) {
  const t = (title || "").toLowerCase();
  if (/^ap\b/.test(t)) return "AP";
  if (/(computer|programming|cs|algorithm|data|network|os)/.test(t)) return "CS";
  if (/(english|literature|writing|composition|grammar|poetry)/.test(t)) return "English";
  if (/(spanish|french|german|japanese|latin|chinese)/.test(t)) return "Languages";
  if (/(math|algebra|calculus|geometry|probability|statistics|linear)/.test(t)) return "Math";
  if (/(bio|chem|physics|earth|astronomy|env|geology)/.test(t)) return "Science";
  return "Other";
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error("Source dir not found:", SRC_DIR);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const aliases = loadAliases();
  const files = fs
    .readdirSync(SRC_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"));

  const items = [];
  for (const f of files) {
    const abs = path.join(SRC_DIR, f);
    try {
      const json = JSON.parse(fs.readFileSync(abs, "utf8"));
      const title = json.topic || path.basename(f, ".json");
      const cards = Array.isArray(json.cards) ? json.cards : [];
      const alias = aliases[title] || {};
      const group = alias.group || guessGroup(title);
      // id is the TITLE as used elsewhere (consistent with prior code)
      items.push({ id: title, title, group, count: cards.length, file: f });
    } catch (e) {
      console.warn("Skipped bad json:", f, e.message);
    }
  }

  // sort by group then alpha
  items.sort((a, b) => (a.group || "").localeCompare(b.group || "") || a.title.localeCompare(b.title));

  // Build import lines + maps
  const importLines = [];
  const mapLines = [];
  let i = 0;

  for (const it of items) {
    const varName = `T${i++}`;
    importLines.push(
      `import ${varName} from "../flashcards/${it.file}";`
    );
    // Expect each JSON to be { topic, cards:[{q,a}...] }
    mapLines.push(`  "${it.title}": (${varName} as any).cards as Card[]`);
  }

  const indexObj = items
    .map((it) => `{ id: ${JSON.stringify(it.title)}, title: ${JSON.stringify(it.title)}, group: ${JSON.stringify(it.group)}, count: ${it.count} }`)
    .join(",\n  ");

  const file = `/* AUTO-GENERATED — do not edit by hand */
export type Card = { q: string; a: string };

${importLines.join("\n")}

export const DATA_MAP: Record<string, Card[]> = {
${mapLines.join(",\n")}
};

export const INDEX = [
  ${indexObj}
];

export const TOPICS = INDEX.map(t => t.title);
`;

  fs.writeFileSync(OUT_FILE, file, "utf8");
  console.log("Wrote", OUT_FILE, "with", items.length, "topics");
}

main();
