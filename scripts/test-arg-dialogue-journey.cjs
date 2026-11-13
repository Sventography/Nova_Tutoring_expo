"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require(path.join(__dirname, "..", "node_modules", "typescript"));
const root = path.join(__dirname, "..");
const stateSource = fs.readFileSync(path.join(root, "app/utils/argState.ts"), "utf8");
const stateJs = ts.transpileModule(stateSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const storage = {
  multiGet: async keys => keys.map(key => [key, null]),
  getItem: async () => null,
  setItem: async () => {}
};
const stateMod = { exports: {} };
new Function("exports", "module", "require", stateJs)(
  stateMod.exports, stateMod, name => {
    if (name === "@react-native-async-storage/async-storage") return { default: storage };
    throw Error("Unexpected import " + name);
  }
);
const arg = stateMod.exports;
const askSource = fs.readFileSync(path.join(root, "app/(tabs)/ask.tsx"), "utf8");
const start = askSource.indexOf("function normalizeArgPrompt(");
const end = askSource.indexOf("/**\n * Resolve already-earned ARG clues locally", start);
assert.ok(start >= 0 && end > start, "canonical dialogue must be testable apart from the API");
const extracted = askSource.slice(start, end) + "\nmodule.exports = { getCanonicalArgReply };";
const script = ts.transpileModule(extracted, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const dialogMod = { exports: {} };
new Function("module", "promptMentionsNv", "getLibraryNotebookFollowUp", script)(
  dialogMod, arg.mentionsNv, arg.getLibraryNotebookFollowUp
);
const reply = (prompt, state, history = []) =>
  dialogMod.exports.getCanonicalArgReply(prompt, history, state, null);
const asMsg = text => [{ role: "assistant", novaIntrusion: true, text }];
const empty = {
  entryNoteDiscovered: false, telescopeClueUnlocked: false, seventeenthStarDiscovered: false,
  nvDiscovered: false, whiteRabbitClueUnlocked: false, whiteRabbitDiscovered: false,
  focusPracticeUnlocked: false, focusPracticeNoteDiscovered: false, focusPracticeNoteSeenAt: null,
  libraryNotebookUnlocked: false, libraryNotebookDiscovered: false, libraryNotebookSeenAt: null,
  lanternCopyDiscovered: false, lanternFolderDiscovered: false, argAct1Complete: false
};
assert.equal(reply("What was I counting?", empty), null, "ordinary use cannot start the ARG");
const note = { ...empty, entryNoteDiscovered: true };
const chart = reply("What was I counting?", note);
assert.ok(chart.includes("sixteen") && chart.includes("seventeen"));
assert.ok(reply("What does that mean?", note, asMsg(chart)).includes("telescope"));
const starState = { ...note, telescopeClueUnlocked: true, seventeenthStarDiscovered: true };
const star = reply("What about the seventeenth star?", starState);
assert.ok(star.includes("drawn in by hand"));
const handwriting = reply("Who drew the star?", starState, asMsg(star));
assert.ok(handwriting.includes("two initials in the corner"));
const nvState = { ...starState, nvDiscovered: true };
assert.equal(reply("What were the initials?", nvState), "N.V.");
const nv = reply("Who is N.V.?", nvState);
assert.ok(nv.includes("white rabbit"), "asking who must lead to the person, not return the initials again");
const rabbitState = { ...nvState, whiteRabbitClueUnlocked: true };
const rabbit = reply("Where is the white rabbit?", rabbitState);
assert.ok(rabbit.includes("Shop"), "the clue needs a place and a reason to look");
assert.ok(reply("Where?", rabbitState, asMsg(rabbit)).includes("Shop"));
const foundRabbit = { ...rabbitState, whiteRabbitDiscovered: true };
const object = reply("Why did she keep the rabbit?", foundRabbit);
assert.ok(object.includes("wrong answers") && object.includes("the chart"));
const practice = reply("Where are the wrong answers?", foundRabbit, asMsg(object));
assert.ok(practice.includes("Look where I keep the questions you miss."));
const focus = { ...foundRabbit, focusPracticeUnlocked: true, focusPracticeNoteDiscovered: true };
const notebookLead = reply("What was her project?", focus);
assert.ok(notebookLead.includes("She kept a notebook for it."));
const readNotebook = { ...focus, libraryNotebookUnlocked: true, libraryNotebookDiscovered: true };
const notebook = reply("What did the notebook mean?", readNotebook);
assert.equal(notebook, arg.LIBRARY_NOTEBOOK_REPLY);
const copy = reply("Why both?", readNotebook, asMsg(notebook));
assert.equal(copy, arg.LANTERN_COPY_REPLY);
const where = reply("Where?", { ...readNotebook, lanternCopyDiscovered: true });
assert.equal(where, arg.LANTERN_FOLDER_REPLY, "where works even if the chat was cleared");
const preserved = reply("What was in the file?", { ...readNotebook, lanternCopyDiscovered: true, lanternFolderDiscovered: true });
assert.equal(preserved, arg.ARG_ACT1_FINALE_REPLY, "finale works across restarts and no longer relies on a preceding exact reply");
console.log("PASS: complete free ARG dialogue route builds curiosity and survives chat interruptions.");
