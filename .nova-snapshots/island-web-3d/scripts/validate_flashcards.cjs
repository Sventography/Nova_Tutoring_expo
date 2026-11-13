const t = require("../app/constants/flashcards/index.js");
const topics = t.FLASHCARD_TOPICS || {};
const keys = Object.keys(topics);
console.log("Included topics:", keys.length);
for (const k of keys) console.log("-", k, ":", topics[k].length, "cards");
if (!keys.length) process.exit(1);
