import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const flashcards = require(path.resolve("app/constants/flashcards/index.ts"));
const topics = flashcards.FLASHCARD_TOPICS || {};
let bad = 0;
for (const k of Object.keys(topics)) {
  const n = Array.isArray(topics[k]) ? topics[k].length : 0;
  if (n < 20) { console.log("NEEDS 20:", k, "has", n); bad++; }
}
if (!bad) console.log("All topics have at least 20 cards.");
