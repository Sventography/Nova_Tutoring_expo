'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = process.env.NOVA_TEST_ROOT || path.resolve(__dirname, '..');
const ts = require(path.join(root, 'node_modules/typescript'));
const source = fs.readFileSync(path.join(root, 'app/context/StreakContext.tsx'), 'utf8');
const callback = source.slice(source.indexOf('  const markToday = useCallback('), source.indexOf('  const resetStreak = useCallback('));
const status = source.match(/async function fetchStreakFromSupabase\([\s\S]*?\n}/)[0];
const compile = text => ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText;
async function check(staging) {
  const calls = [];
  const failure = {code: 'PGRST202'};
  const sandbox = { COLLECTOR_STAGING_MODE: staging, meta: {count: 0}, markTodayInFlightRef: {current: null}, useCallback: fn => fn, getEasternDayId: () => '2026-10-31', supabaseUserId: 'test-owner', supabase: {rpc: async name => {calls.push(name); return {error: failure};}}, console: {warn() {}} };
  for (const key of ['addCoins','axolotlKey','calculateCoinReward','hasAxolotl','logs','logsKey','metaKey','persistAll','refreshCoins']) sandbox[key] = () => {throw new Error('Unexpected side effect: '+key);};
  vm.createContext(sandbox);
  vm.runInContext(compile(status + '\n' + callback + '\nglobalThis.claim = markToday; globalThis.status = fetchStreakFromSupabase;'), sandbox);
  if (staging) {
    assert.equal(await sandbox.status('test-owner'), null);
    for (let i=0; i<2; i++) {
      const result = await sandbox.claim();
      assert.equal(result.awarded, false);
      assert.equal(result.coinsAwarded, 0);
      assert.equal(result.streakDays, 0);
    }
    assert.deepEqual(calls, [], 'Collector staging must not call economy RPCs or award local coins');
  } else {
    assert.equal(await sandbox.status('test-owner'), null);
    await assert.rejects(sandbox.claim(), error => error === failure);
    assert.deepEqual(calls, ['nova_streak_economy_status','nova_mark_daily_streak'], 'Normal Nova still uses server-authoritative streak RPCs');
    assert.equal(sandbox.markTodayInFlightRef.current, null);
  }
}
(async () => {await check(true); await check(false); console.log('PASS: staging streak calls are non-awarding/no-RPC; normal Nova RPC failures remain visible to callers.');})().catch(error => {console.error(error); process.exitCode = 1;});
