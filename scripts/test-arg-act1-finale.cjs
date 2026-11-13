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
const ask = (question, previous = "", discovered = true, copy = false, folder = false) =>
  a.getLibraryNotebookFollowUp(question, previous, discovered, copy, folder);
(async () => {
  assert.equal(ask("What was in the file?", a.LANTERN_FOLDER_REPLY, false), null, "ordinary tutoring must not accidentally reveal the story");
  assert.equal(ask("What was in the file?", a.LIBRARY_NOTEBOOK_REPLY), null, "no shortcut from the notebook to finale");
  const copy = ask("Why did she keep both answers?", a.LIBRARY_NOTEBOOK_REPLY);
  assert.equal(copy, a.LANTERN_COPY_REPLY);
  assert.equal(copy.includes("WRONG"), true);
  const folder = ask("Where did she put the copy?", copy);
  assert.equal(folder, a.LANTERN_FOLDER_REPLY);
  assert.ok(folder.includes("telescope"), "lantern must tie back to the opening object");
  assert.equal(ask("What was in the file?", folder), a.ARG_ACT1_FINALE_REPLY);
  assert.ok(a.ARG_ACT1_FINALE_REPLY.includes("The first answer was wrong. It was still hers."));
  assert.ok(a.ARG_ACT1_FINALE_REPLY.includes("SESSION 017"));
  assert.ok(a.ARG_ACT1_FINALE_REPLY.includes("QUIET"));
  assert.equal(await a.markLanternCopyDiscovered(), false, "must find notebook");
  assert.equal(await a.markLanternFolderDiscovered(), false, "must find copy");
  assert.equal(await a.markArgAct1Complete(), false, "must find folder");
  for (const key of [
    a.ARG_ENTRY_NOTE_DISCOVERED_KEY,
    a.ARG_TELESCOPE_CLUE_UNLOCKED_KEY,
    a.ARG_SEVENTEENTH_STAR_DISCOVERED_KEY,
    a.ARG_NV_DISCOVERED_KEY,
    a.ARG_WHITE_RABBIT_CLUE_UNLOCKED_KEY,
    a.ARG_WHITE_RABBIT_DISCOVERED_KEY,
    a.ARG_FOCUS_PRACTICE_UNLOCKED_KEY,
    a.ARG_FOCUS_NOTE_DISCOVERED_KEY,
    a.ARG_LIBRARY_NOTEBOOK_UNLOCKED_KEY,
    a.ARG_LIBRARY_NOTEBOOK_DISCOVERED_KEY
  ]) store.set(key, "1");
  assert.equal(await a.markLanternFolderDiscovered(), false, "copy is required first");
  assert.equal(await a.markLanternCopyDiscovered(), true);
  assert.equal(await a.markLanternCopyDiscovered(), false);
  let state = await a.getArgDiscoveryState();
  assert.equal(state.lanternCopyDiscovered, true);
  assert.equal(ask("Where was the copy?", "", true, state.lanternCopyDiscovered, state.lanternFolderDiscovered), a.LANTERN_FOLDER_REPLY, "chat history must not be required");
  assert.equal(await a.markLanternFolderDiscovered(), true);
  state = await a.getArgDiscoveryState();
  assert.equal(ask("What was in the file?", "", true, state.lanternCopyDiscovered, state.lanternFolderDiscovered), a.ARG_ACT1_FINALE_REPLY, "chapter finale can survive app restart");
  assert.equal(await a.markArgAct1Complete(), true);
  assert.equal(await a.markArgAct1Complete(), false, "claim is idempotent");
  assert.equal((await a.getArgDiscoveryState()).argAct1Complete, true);
  console.log("PASS: Act I evidence is coherent, sequential, persistent, and idempotent.");
})().catch(e => { console.error(e); process.exitCode = 1; });
