"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require(path.join(__dirname, "..", "node_modules", "typescript"));
const source = fs.readFileSync(path.join(__dirname, "..", "app/utils/argState.ts"), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const store = new Map();
const storage = {
  multiGet: async keys => keys.map(key => [key, store.get(key) ?? null]),
  getItem: async key => store.get(key) ?? null,
  setItem: async (key, value) => { store.set(key, value); }
};
const mod = { exports: {} };
new Function("exports", "module", "require", js)(mod.exports, mod, name => {
  if (name === "@react-native-async-storage/async-storage") return { default: storage };
  throw Error("Unexpected module: " + name);
});
const a = mod.exports;
(async () => {
  assert.equal(a.getLibraryNotebookFollowUp("what was in the file", a.LANTERN_FOLDER_REPLY, false), null, "ordinary tutoring must stay outside the ARG");
  assert.equal(a.getLibraryNotebookFollowUp("why both?", a.LIBRARY_NOTEBOOK_REPLY, true)?.includes("made a copy"), true);
  const copy = a.getLibraryNotebookFollowUp("why both?", a.LIBRARY_NOTEBOOK_REPLY, true);
  const folder = a.getLibraryNotebookFollowUp("where?", copy, true);
  assert.equal(folder, a.LANTERN_FOLDER_REPLY);
  assert.equal(a.getLibraryNotebookFollowUp("what was in the file?", folder, true), a.ARG_ACT1_FINALE_REPLY);
  assert.equal(a.getLibraryNotebookFollowUp("what was in the file?", a.LIBRARY_NOTEBOOK_REPLY, true), null, "cannot skip the Lantern folder");
  assert.equal(await a.markArgAct1Complete(), false, "cannot mark a chapter complete before the notebook");
  for (const key of [a.ARG_ENTRY_NOTE_DISCOVERED_KEY,a.ARG_TELESCOPE_CLUE_UNLOCKED_KEY,a.ARG_SEVENTEENTH_STAR_DISCOVERED_KEY,a.ARG_NV_DISCOVERED_KEY,a.ARG_WHITE_RABBIT_CLUE_UNLOCKED_KEY,a.ARG_WHITE_RABBIT_DISCOVERED_KEY,a.ARG_FOCUS_PRACTICE_UNLOCKED_KEY,a.ARG_FOCUS_NOTE_DISCOVERED_KEY,a.ARG_LIBRARY_NOTEBOOK_UNLOCKED_KEY,a.ARG_LIBRARY_NOTEBOOK_DISCOVERED_KEY]) store.set(key, "1");
  assert.equal(await a.markArgAct1Complete(), true);
  assert.equal(await a.markArgAct1Complete(), false, "completion is idempotent");
  assert.equal((await a.getArgDiscoveryState()).argAct1Complete, true);
  console.log("PASS: Act I finale is sequential, optional, persistent, and idempotent.");
})().catch(e => { console.error(e); process.exitCode = 1; });
