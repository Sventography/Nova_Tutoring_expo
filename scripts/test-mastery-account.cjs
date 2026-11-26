// Exercise the render boundary without connecting to a wallet or Supabase.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const source = fs.readFileSync("features/adaptiveIsland/MasteryCheck.tsx", "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
});
const env = { EXPO_PUBLIC_SUPABASE_URL: "https://gouhhltupxaycuysdtrw.supabase.co" };
let account;
const exportsUnderTest = {};
vm.runInNewContext(outputText, {
  exports: exportsUnderTest,
  process: { env },
  require(name) {
    if (name === "react") return React;
    if (name.endsWith("/UserContext")) return { useUser: () => account };
    return {};
  },
});
const render = (lesson = "space-light") => exportsUnderTest.default({lesson});
account = { ready: true, session: { user: { id: "first" } } };
assert.equal(render(), null);
env.EXPO_PUBLIC_GARDEN_CHECKS = "true";
const initial = render();
assert.ok(initial);
assert.notEqual(initial.key, render("music-octave").key);
assert.equal(render("other"), null);
account.session.user.id = "second";
assert.notEqual(initial.key, render().key);
account.session.user.is_anonymous = true;
assert.equal(render(), null);
account.session = null;
assert.equal(render(), null);
console.log("PASS verified-check visibility and React state isolation across accounts and lessons");
