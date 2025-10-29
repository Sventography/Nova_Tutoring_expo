const fs = require("fs");
const path = require("path");
const dir = path.join("app","constants","flashcards");
const files = fs.readdirSync(dir).filter(f => f.endsWith(".json")).sort();
function slugFromFile(f){ return f.replace(/\.json$/,""); }
function varName(slug){ return slug.replace(/[^a-zA-Z0-9_]/g,"_"); }

let imports = [];
let entries = [];
for (const f of files) {
  const slug = slugFromFile(f);
  const v = varName(slug);
  imports.push(`import ${v} from "./${f}";`);
  entries.push(`  { ...${v}, slug: "${slug}" }`);
}
const out = `export type Flashcard = { q: string; a: string };
export type TopicPack = { topic: string; slug: string; flashcards: Flashcard[] };

${imports.join("\n")}

export const TOPIC_PACKS: TopicPack[] = [
${entries.join(",\n")}
];
`;
const outFile = path.join(dir, "index.ts");
fs.writeFileSync(outFile, out);
console.log("✅ Rebuilt", outFile, "with", files.length, "packs.");
