/**
 * Scans app/data/flashcards/*.json and generates app/data/flashcards/index.ts
 * Metro needs static requires, so we emit a registry with require() calls.
 */
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "app", "data", "flashcards");
const outFile = path.join(dataDir, "index.ts");

if (!fs.existsSync(dataDir)) {
  console.error("Missing directory:", dataDir);
  process.exit(1);
}

const files = fs
  .readdirSync(dataDir)
  .filter((f) => f.endsWith(".json"))
  .sort((a, b) => a.localeCompare(b));

const entries = files.map((f) => {
  const topic = f.replace(/\.json$/, "");
  const rel = "./" + f;
  return `  ${JSON.stringify(topic)}: () => require(${JSON.stringify(rel)}) as { default?: any } | any,`;
});

const source = `// AUTO-GENERATED. Do not edit by hand.
export const registry: Record<string, () => any> = {
${entries.join("\n")}
};

export const topics = Object.keys(registry);

export async function loadCards(topic: string): Promise<Array<{front:string; back:string}>> {
  const mod = registry[topic]?.();
  const data = (mod && mod.default) ? mod.default : mod;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.cards)) return data.cards;
  return [];
}
`;

fs.writeFileSync(outFile, source, "utf8");
console.log("Wrote", outFile, "with", files.length, "topics.");
