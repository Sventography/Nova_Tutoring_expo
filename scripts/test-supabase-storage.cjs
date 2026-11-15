// Execute the application's Supabase configuration with platform/storage doubles.
// No network, credentials, or account data. Run with node scripts/test-supabase-storage.cjs.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.env.NOVA_TEST_ROOT || path.resolve(__dirname, '..');
const ts = require(path.join(root, 'node_modules/typescript'));
const source = fs.readFileSync(path.join(root, 'app/lib/supabase.ts'), 'utf8');
const output = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
function configure(os, browser) {
  let options;
  const calls = [];
  const values = new Map();
  const storage = Object.fromEntries(['getItem', 'setItem', 'removeItem'].map(method => [method, async (key, value) => {
    if (os === 'web' && !browser) throw new ReferenceError('window is not defined');
    calls.push(method);
    if (method === 'getItem') return values.get(key) ?? null;
    if (method === 'setItem') values.set(key, value);
    if (method === 'removeItem') values.delete(key);
  }]));
  const sandbox = {exports: {}, __DEV__: false, console, process: {env: {EXPO_PUBLIC_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'test-placeholder'}}, require(name) {
    if (name === 'react-native-url-polyfill/auto') return {};
    if (name === '@react-native-async-storage/async-storage') return {default: storage};
    if (name === 'react-native') return {Platform: {OS: os}};
    if (name === 'expo-constants') return {default: {}};
    if (name === '@supabase/supabase-js') return {createClient: (url, key, config) => {options = config; return {};}};
    throw Error('Unexpected import: ' + name);
  }};
  if (browser) sandbox.window = {};
  vm.runInNewContext(output, sandbox);
  return {options, calls};
}
(async () => {
  for (const [os, browser] of [['web', false], ['web', true], ['ios', false], ['android', false]]) {
    const {options, calls} = configure(os, browser);
    assert.equal(options.auth.storageKey, 'nova.supabase.auth.v3');
    assert.equal(options.auth.persistSession, true);
    assert.equal(options.auth.autoRefreshToken, true);
    const storage = options.auth.storage;
    await storage.setItem('session', 'preserved');
    assert.equal(await storage.getItem('session'), os === 'web' && !browser ? null : 'preserved');
    await storage.removeItem('session');
    assert.equal(await storage.getItem('session'), null);
    assert.deepEqual(calls, os === 'web' && !browser ? [] : ['setItem', 'getItem', 'removeItem', 'getItem']);
  }
  console.log('PASS: web server never accesses AsyncStorage; browser/iOS/Android preserve session storage and auth configuration.');
})().catch(error => {console.error(error); process.exitCode = 1;});
