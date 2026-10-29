/**
 * Prevents a collector iPhone test from overwriting or connecting to
 * the production Nova installation. Pure config checks, no Apple login,
 * no EAS deployment and no calls to production services.
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "app.config.js"), "utf8");
const output = ts.transpileModule(source, {
  fileName: "app.config.js",
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    allowJs: true,
  },
  reportDiagnostics: true,
});
const errors = (output.diagnostics || []).filter(
  d => d.category === ts.DiagnosticCategory.Error
);
assert.equal(errors.length, 0, "app.config.js must transpile without JS syntax errors");

function loadConfig(env) {
  const mod = { exports: {} };
  vm.runInNewContext(output.outputText, {
    module: mod, exports: mod.exports,
    process: { env },
  }, { filename: "app.config.js" });
  assert.equal(typeof mod.exports.default, "function");
  return mod.exports.default({ config: { ios: {}, android: {}, extra: {} } });
}

const stageEnv = {
  EXPO_PUBLIC_COLLECTOR_STAGING_MODE: "true",
  EAS_BUILD_PROFILE: "collector-staging-ios",
};
const stage = loadConfig(stageEnv);
const prod = loadConfig({
  EXPO_PUBLIC_COLLECTOR_STAGING_MODE: "false",
  EAS_BUILD_PROFILE: "production",
  EXPO_PUBLIC_BACKEND_URL: "https://nova-tutoring-backend.onrender.com",
});
const expectedStage = "https://gouhhltupxaycuysdtrw.supabase.co";
assert.equal(stage.name, "Nova Collector Staging");
assert.equal(stage.scheme, "novacollectorstage");
assert.equal(stage.ios.bundleIdentifier,
  "com.sventography.novatutoring.ios.collectorstage");
assert.equal(stage.android.package,
  "com.sventography.novatutoring.collectorstage");
assert.equal(stage.extra.EXPO_PUBLIC_SUPABASE_URL, expectedStage);
assert.equal(stage.extra.EXPO_PUBLIC_BACKEND_URL, expectedStage);
assert.match(stage.extra.EXPO_PUBLIC_SUPABASE_ANON_KEY, /^sb_publishable_/);
assert.notEqual(stage.ios.bundleIdentifier, prod.ios.bundleIdentifier);
assert.notEqual(stage.scheme, prod.scheme);

assert.equal(prod.name, "Nova Tutoring");
assert.equal(prod.scheme, "nova");
assert.equal(prod.ios.bundleIdentifier,
  "com.sventography.novatutoring.ios");
assert.equal(prod.android.package,
  "com.sventography.novatutoring");
assert.equal(prod.extra.EXPO_PUBLIC_BACKEND_URL,
  "https://nova-tutoring-backend.onrender.com");

assert.throws(() => loadConfig({
  EXPO_PUBLIC_COLLECTOR_STAGING_MODE: "false",
  EAS_BUILD_PROFILE: "collector-staging-ios",
}), /Collector iPhone build refused/);
assert.throws(() => loadConfig({
  EXPO_PUBLIC_COLLECTOR_STAGING_MODE: "true",
  EAS_BUILD_PROFILE: "production",
}), /Collector staging cannot be built/);

const eas = JSON.parse(fs.readFileSync(path.join(root, "eas.json"), "utf8"));
const profile = eas.build["collector-staging-ios"];
assert.ok(profile, "Staging iPhone build profile must exist");
assert.equal(profile.developmentClient, true);
assert.equal(profile.distribution, "internal");
assert.equal(profile.ios.simulator, false);
assert.equal(profile.env.EXPO_PUBLIC_COLLECTOR_STAGING_MODE, "true");
assert.equal(profile.env.EXPO_PUBLIC_COLLECTOR_REDEMPTION_ENABLED, "true");
assert.equal(profile.env.EXPO_NO_DOTENV, "1");
assert.equal(profile.env.EXPO_PUBLIC_NORAS_LANTERN_PREVIEW, "false");
assert.equal(profile.env.EXPO_PUBLIC_SUPABASE_URL, expectedStage);
assert.equal(profile.env.EXPO_PUBLIC_BACKEND_URL, expectedStage);
assert.equal(profile.env.EXPO_PUBLIC_OPENAI_API_KEY, "dummy-key");
assert.ok(!eas.build.production.env?.EXPO_PUBLIC_COLLECTOR_STAGING_MODE);
assert.ok(!eas.build.development.env?.EXPO_PUBLIC_COLLECTOR_STAGING_MODE);

console.log("iPhone collector staging app isolation and EAS profile checks passed.");
