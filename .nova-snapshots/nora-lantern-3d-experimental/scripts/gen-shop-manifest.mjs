#!/usr/bin/env node
// scripts/gen-shop-manifest.mjs
import fs from "fs";
import path from "path";

const ASSETS_DIR = path.resolve("app/assets/shop");
const OUT_FILE   = path.resolve("app/_lib/shop-images.ts");

// Helper: ts-safe key from filename (strip .png)
const toKey = (f) => f.replace(/\.png$/i, "");

// Detect front/back pairs by suffixes
const FRONT_RE = /_front(?:_[a-z0-9]+)?$/i;
const BACK_RE  = /_back(?:_[a-z0-9]+)?$/i;

function main() {
  if (!fs.existsSync(ASSETS_DIR)) {
    console.error(`Assets folder not found: ${ASSETS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(ASSETS_DIR)
    .filter(f => f.toLowerCase().endsWith(".png"))
    .sort((a,b) => a.localeCompare(b));

  const keys = files.map(toKey);
  // Build IMAGES map keys → require path
  const imagesEntries = keys.map(k => `  "${k}": require("../assets/shop/${k}.png"),`);

  // Build pairs: base name without _front/_back
  const bases = new Map(); // baseKey -> {front?: key, back?: key}
  for (const k of keys) {
    const isFront = FRONT_RE.test(k);
    const isBack  = BACK_RE.test(k);
    if (isFront || isBack) {
      const base = k.replace(FRONT_RE, "").replace(BACK_RE, "");
      const entry = bases.get(base) || {};
      if (isFront) entry.front = k;
      if (isBack)  entry.back  = k;
      bases.set(base, entry);
    }
  }

  // Compose SHOP_PAIRS
  const pairLines = [];
  // Include only bases that have a front OR back (we still list one-sided so UI can show single image)
  for (const [base, pair] of Array.from(bases.entries()).sort()) {
    const front = pair.front ? `"${pair.front}"` : "undefined";
    const back  = pair.back  ? `"${pair.back}"`  : "undefined";
    pairLines.push(`  "${base}": { front: ${front}, back: ${back} },`);
  }

  // Union type of keys
  const union = keys.map(k => `  | "${k}"`).join("\n");

  // Optional legacy alias (example: plushie_star → plushie_star_front if both exist)
  const wantLegacyAliases = [
    ["plushie_star", "plushie_star_front"]
  ].filter(([legacy, front]) => keys.includes(front));

  const legacyImageLines = wantLegacyAliases
    .filter(([legacy]) => !keys.includes(legacy))
    .map(([legacy, front]) => `  "${legacy}": require("../assets/shop/${front}.png"), // legacy alias`);

  const content = `/* AUTO-GENERATED — DO NOT EDIT
   Run: npm run gen:shop  (or: node scripts/gen-shop-manifest.mjs)
*/
export type ShopImageKey =
${union};

export const SHOP_IMAGES: Record<ShopImageKey, any> = {
${imagesEntries.join("\n")}
${legacyImageLines.join("\n")}
} as const;

export const SHOP_PAIRS: Record<string, { front?: ShopImageKey; back?: ShopImageKey }> = {
${pairLines.join("\n")}
};

// Convenience re-exports
export type { ShopImageKey as ImgKey };
// End of generated file.
`;

  fs.writeFileSync(OUT_FILE, content, "utf8");
  console.log(`✅ Wrote ${OUT_FILE} with ${keys.length} images and ${bases.size} pairs.`);
}

main();
