// No network or credentials required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'app/services/leaderboard.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, reportDiagnostics: true });
assert.equal(compiled.diagnostics.length, 0);
const calls = [];
const response = { data: [{ user_id: 'fixture', coins: 5 }], error: null };
const query = {
  select(columns) { calls.push(['select', columns]); return this; },
  order(column, options) { calls.push(['order', column, options.ascending]); return this; },
  limit(count) { calls.push(['limit', count]); return Promise.resolve(response); },
  upsert(payload, options) { calls.push(['upsert', payload.user_id, options.onConflict]); return Promise.resolve(response); },
};
const loaded = {};
vm.runInNewContext(compiled.outputText, { exports: loaded, require(name) {
  assert.equal(name, '../lib/supabase', 'Leaderboard must use the shared auth client');
  return { supabase: { from(table) { calls.push(['from', table]); return query; } } };
} });
(async () => {
  assert.equal(await loaded.lbTop(20), response);
  assert.deepEqual(calls.splice(0), [['from', 'coins_leaderboard'], ['select', 'user_id, display_name, avatar_url, coins'], ['order', 'coins', false], ['limit', 20]]);
  assert.equal(await loaded.lbUpsert({ user_id: 'fixture', display_name: 'Test', coins: 5 }), response);
  assert.deepEqual(calls, [['from', 'coins_leaderboard'], ['upsert', 'fixture', 'user_id']]);
  console.log('PASS: leaderboard uses shared authenticated client and preserves existing queries.');
})().catch(error => { console.error(error); process.exitCode = 1; });
