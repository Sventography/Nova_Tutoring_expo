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

const authA = "https://gouhhltupxaycuysdtrw.supabase.co";
const authB = "https://bbbbbbbbbbbbbbbbbbbb.supabase.co";
const backend = authA;
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

// Regression: local Expo .env / an old manifest can still contain live
// values. Explicit collector staging MUST ignore them, on both JS runtime
// and Expo's Node/SSR configuration path.
const staleAuth = "https://owlbqyiqsyfcrpqqfacp.supabase.co";
const staleBackend = "https://nove-tutoring-backend.onrender.com";
const stageRuntime = staging.resolvedCollectorAppConfig(
  staleAuth, "old-production-public-key", staleBackend
);
assert.equal(stageRuntime.supabaseUrl, authA);
assert.equal(stageRuntime.backendUrl, authA);
assert.equal(
  stageRuntime.publicKey, staging.COLLECTOR_STAGING_PUBLISHABLE_KEY
);
assert.match(stageRuntime.publicKey, /^sb_publishable_/);
const liveRuntime = production.resolvedCollectorAppConfig(
  staleAuth, "old-production-public-key", staleBackend
);
assert.equal(liveRuntime.supabaseUrl, staleAuth);
assert.equal(liveRuntime.backendUrl, staleBackend);
assert.equal(liveRuntime.publicKey, "old-production-public-key");
checks += 7;

accepts(authA, backend);
rejects(authB, backend);
assert.equal(
  hostedPreview.collectorStagingConfigError(authA, backend, hostedPreview.COLLECTOR_STAGING_BUILD_ALLOWED),
  null
);
assert.equal(
  typeof sealedRelease.collectorStagingConfigError(authA, backend, sealedRelease.COLLECTOR_STAGING_BUILD_ALLOWED),
  "string"
);
checks += 2;
rejects(authA, "http://127.0.0.1:5059");
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

// Verify that the mobile client dispatches staging calls to Edge, while
// production requests retain their existing Flask collector route.
const collectorClient = fs.readFileSync(
  path.join(__dirname, "../app/_lib/collectorClient.ts"), "utf8"
);
const edge = fs.readFileSync(
  path.join(__dirname, "../supabase/functions/collector-staging/index.ts"), "utf8"
);
assert.match(collectorClient, /functions\/v1\/collector-staging/);
assert.match(collectorClient, /"api\/collector"/);
assert.match(collectorClient, /apikey: STAGING_PUBLISHABLE_KEY/);
assert.match(edge, /const STAGING_REF = "gouhhltupxaycuysdtrw"/);
assert.match(edge, /client\.auth\.getUser\(bearer\[1\]\)/);
assert.match(edge, /collector_private\.claim_castle_017/);
assert.match(edge, /collector_private\.allow_redemption_attempt/);
checks += 7;

// Guard both the Node-side Expo configuration and direct collector requests.
// Production config branch must remain the original env-based behavior.
const expoConfig = fs.readFileSync(
  path.join(__dirname, "../app.config.js"), "utf8"
);
const appClient = fs.readFileSync(
  path.join(__dirname, "../app/lib/supabase.ts"), "utf8"
);
const launcher = fs.readFileSync(
  path.join(__dirname, "start-collector-staging-web.sh"), "utf8"
);
assert.match(expoConfig, /const collectorStaging =/);
assert.match(expoConfig, /EXPO_PUBLIC_SUPABASE_URL: collectorStaging/);
assert.match(expoConfig, /EXPO_PUBLIC_SUPABASE_ANON_KEY: collectorStaging/);
assert.match(appClient, /resolvedCollectorAppConfig\(/);
assert.match(collectorClient, /COLLECTOR_STAGING_SUPABASE_URL/);
assert.match(collectorClient, /COLLECTOR_STAGING_PUBLISHABLE_KEY/);
assert.match(launcher, /export EXPO_NO_DOTENV=1/);
assert.match(launcher, /export EXPO_PUBLIC_COLLECTOR_STAGING_MODE=true/);
checks += 8;
console.log("Collector staging configuration: " + checks + " assertions passed.");
