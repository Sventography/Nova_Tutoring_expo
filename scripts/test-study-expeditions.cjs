"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require(path.join(__dirname, "..", "node_modules", "typescript"));
const mod = { exports: {} };
const src = fs.readFileSync(path.join(__dirname, "..", "app", "_lib", "studyExpeditions.ts"), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
new Function("exports", "module", js)(mod.exports, mod);
const { STUDY_EXPEDITIONS, expeditionForDate, localExpeditionDateKey } = mod.exports;
assert.equal(STUDY_EXPEDITIONS.length, 3);
for (const expedition of STUDY_EXPEDITIONS) {
  assert.equal(expedition.questions.length, 3);
  for (const q of expedition.questions) {
    assert.equal(q.choices.length, 4);
    assert.ok(Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < q.choices.length);
    assert.ok(q.question && q.hint && q.explanation);
    assert.ok(q.choices.every(Boolean));
  }
}
assert.equal(localExpeditionDateKey(new Date(2026, 10, 13)), "2026-11-13");
for (const day of ["2026-11-13", "2026-11-14", "2026-11-15", "2026-12-01"]) {
  const e = expeditionForDate(day);
  assert.ok(STUDY_EXPEDITIONS.some((candidate) => candidate.id === e.id));
  assert.equal(expeditionForDate(day).id, e.id);
}
assert.notEqual(expeditionForDate("2026-11-13").id, expeditionForDate("2026-11-14").id);
console.log("PASS: expeditions have valid challenges, feedback and stable daily rotation.");
