import fs from "fs";
import path from "path";

const dir = "app/constants/flashcards";
const outTS = path.join(dir, "index.ts");
const outJS = path.join(dir, "index.js");
const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));

const toTitle = (fname) => fname.replace(/\.json$/,"").replace(/[_\-]+/g," ").replace(/\b\w/g, s => s.toUpperCase()).replace(/\bEm\b/g,"EM");

const headerTS =
  'export type Card = { question: string; answer: string };\n' +
  'function normalize(raw: any[]): Card[] {\n' +
  '  if (!Array.isArray(raw)) return [];\n' +
  '  return raw.map((it) => {\n' +
  '    const q = it?.question ?? it?.front ?? it?.prompt ?? it?.q ?? it?.Question ?? it?.Front;\n' +
  '    const a = it?.answer   ?? it?.back  ?? it?.a      ?? it?.correct ?? it?.Answer   ?? it?.Back;\n' +
  '    if (!q || !a) return null;\n' +
  '    return { question: String(q), answer: String(a) };\n' +
  '  }).filter(Boolean) as Card[];\n' +
  '}\n' +
  'export const FLASHCARD_TOPICS: Record<string, Card[]> = {\n';

const headerJS =
  'function normalize(raw){ if(!Array.isArray(raw)) return []; return raw.map(function(it){ var q=it?.question??it?.front??it?.prompt??it?.q??it?.Question??it?.Front; var a=it?.answer??it?.back??it?.a??it?.correct??it?.Answer??it?.Back; if(!q||!a) return null; return {question:String(q),answer:String(a)}; }).filter(Boolean); }\n' +
  'const FLASHCARD_TOPICS = {\n';

let bodyTS = "";
let bodyJS = "";
for (const f of files) {
  const raw = JSON.parse(fs.readFileSync(path.join(dir,f),"utf8"));
  const valid = Array.isArray(raw) && raw.filter(it => (it?.question||it?.front||it?.prompt||it?.q||it?.Question||it?.Front) && (it?.answer||it?.back||it?.a||it?.correct||it?.Answer||it?.Back)).length >= 20;
  if (!valid) continue;
  const title = toTitle(f);
  bodyTS += `  "${title}": normalize(require("./${f}")), \n`;
  bodyJS += `  "${title}": normalize(require("./${f}")), \n`;
}

const footerTS = '};\nexport default FLASHCARD_TOPICS;\n';
const footerJS = '};\nmodule.exports = { FLASHCARD_TOPICS, default: FLASHCARD_TOPICS };\n';

fs.writeFileSync(outTS, headerTS + bodyTS + footerTS, "utf8");
fs.writeFileSync(outJS, headerJS + bodyJS + footerJS, "utf8");
console.log(`Wrote ${outTS} and ${outJS}. Topics included only if they have ≥20 valid cards.`);
