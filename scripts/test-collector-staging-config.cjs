/* Isolated staging configuration regression tests.
 * Uses the project's existing TypeScript devDependency; no backend, no
 * network, and no Supabase secrets. Run: node scripts/test-collector-staging-config.cjs
 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(
  path.join(__dirname, "../app/_lib/collectorStaging.ts"), "utf8"
);
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

function runConfig(staging, dev = true, preview = false) {
  const mod = { exports: {} };
  const sandbox = {
    __DEV__: dev,
    module: mod,
    exports: mod.exports,
    process: {
      env: {
        EXPO_PUBLIC_COLLECTOR_STAGING_MODE: staging ? "true" : "false",
        EXPO_PUBLIC_COLLECTOR_STAGING_WEB_PREVIEW: preview ? "true" : "false",
      },
    },
    URL,
    Set,
    Array,
  };
  vm.runInNewContext(output, sandbox, {
    filename: "app/_lib/collectorStaging.ts",
  });
  return mod.exports;
}

const staging = runConfig(true);
const production = runConfig(false);
const hostedPreview = runConfig(true, false, true);
const sealedRelease = runConfig(true, false, false);
const problem = (auth, api, dev = true) =>
  staging.collectorStagingConfigError(auth, api, dev);

const authA = "https://abcdefghijklmnopqrst.supabase.co";
const authB = "https://bbbbbbbbbbbbbbbbbbbb.supabase.co";
const backend = "https://nova-collector-staging.onrender.com";
let checks = 0;

function accepts(auth, api, dev = true) {
  assert.equal(problem(auth, api, dev), null);
  checks++;
}
function rejects(auth, api, dev = true) {
  assert.equal(typeof problem(auth, api, dev), "string");
  checks++;
}

assert.equal(staging.COLLECTOR_STAGING_MODE, true);
assert.equal(production.COLLECTOR_STAGING_MODE, false);
assert.equal(staging.COLLECTOR_STAGING_BUILD_ALLOWED, true);
assert.equal(hostedPreview.COLLECTOR_STAGING_BUILD_ALLOWED, true);
assert.equal(sealedRelease.COLLECTOR_STAGING_BUILD_ALLOWED, false);
checks += 5;
accepts(authA, backend);
accepts(authB, backend);
assert.equal(
  hostedPreview.collectorStagingConfigError(authA, backend, hostedPreview.COLLECTOR_STAGING_BUILD_ALLOWED),
  null
);
assert.equal(
  typeof sealedRelease.collectorStagingConfigError(authA, backend, sealedRelease.COLLECTOR_STAGING_BUILD_ALLOWED),
  "string"
);
checks += 2;
accepts(authA, "http://127.0.0.1:5059");
rejects("http://127.0.0.1:54321", "http://127.0.0.1:5059");
rejects(authA + "/auth/v1", backend);
rejects(authA, backend + "/api/collector");
rejects("https://owlbqyiqsyfcrpqqfacp.supabase.co", backend);
rejects("https://zgrixkqcowitlygbvrlw.supabase.co", backend);
rejects(authA, "https://nove-tutoring-backend.onrender.com");
rejects(authA, "https://nova-tutoring-backend.onrender.com");
rejects(authA, "http://192.168.1.74:5059");
rejects("http://192.168.1.74:54321", backend);
rejects("http://abcdefghijklmnopqrst.supabase.co", backend);
rejects(authA, backend, false);
rejects(authA, "");
rejects(authA, "https://username:password@staging.example.net");
assert.equal(
  production.collectorStagingStorageKey(authA),
  "nova.supabase.auth.v3"
);
checks++;
assert.notEqual(
  staging.collectorStagingStorageKey(authA),
  production.collectorStagingStorageKey(authA)
);
assert.notEqual(
  staging.collectorStagingStorageKey(authA),
  staging.collectorStagingStorageKey(authB)
);
checks += 2;
console.log("Collector staging configuration: " + checks + " assertions passed.");
