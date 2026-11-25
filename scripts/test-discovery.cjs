// Run with node scripts/test-discovery.cjs after npm ci.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../app/_lib/discoveryModel.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
const mod = { exports: {} };
new Function('module', 'exports', outputText)(mod, mod.exports);
const { DISCOVERIES, INTERESTS, dailyDiscovery, normalizeInterests, localDay, discoveryForId, discoveryStorageKey, jumpModel } = mod.exports;
assert.equal(DISCOVERIES.length, 20);
assert.equal(new Set(DISCOVERIES.map(d => d.id)).size, DISCOVERIES.length);
for (const [interest] of INTERESTS) {
  const a = dailyDiscovery([interest], 100);
  const b = dailyDiscovery([interest], 101);
  assert.equal(a.interest, interest);
  assert.equal(b.interest, interest);
  assert.notEqual(a.id, b.id);
  assert.equal(dailyDiscovery([interest], 100).id, a.id);
}
assert.deepEqual(normalizeInterests(['film', 'film', 'music', 'unknown', null]), ['film', 'music']);
assert.deepEqual(normalizeInterests({}), []);
assert.ok(dailyDiscovery([], -1));
assert.equal(localDay(new Date(2026, 10, 25, 0, 1)) - localDay(new Date(2026, 10, 24, 23, 59)), 1);
assert.equal(discoveryForId('space-gravity').interest, 'space');
assert.equal(discoveryForId(['space-gravity']), undefined);
assert.equal(discoveryForId('invalid'), undefined);
assert.notEqual(discoveryStorageKey(null), discoveryStorageKey('guest'));
assert.notEqual(discoveryStorageKey('a'), discoveryStorageKey('b'));
assert.ok(jumpModel(1.62).meters > jumpModel(9.81).meters);
assert.ok(jumpModel(1.62).seconds > jumpModel(9.81).seconds);
assert.throws(() => jumpModel(0));
assert.throws(() => jumpModel(NaN));
console.log('Discovery model checks passed');
