'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function execute(source, globals = {}) {
  const sandbox = {exports: {}, ...globals};
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020},
  }).outputText, sandbox);
  return sandbox;
}
const {passwordRecoveryRedirect} = execute(fs.readFileSync(path.join(root, 'app/_lib/passwordRecovery.ts'), 'utf8'), {URL}).exports;
const nativeRedirect = 'https://confirm.example.com/auth/confirmed';
const configured = 'https://nova-preview.example.com/auth/callback';
const args = {platform: 'web', browserOrigin: 'https://unique-build.example.com', nativeRedirect};
assert.equal(passwordRecoveryRedirect(args), 'https://unique-build.example.com/auth/callback');
assert.equal(passwordRecoveryRedirect({...args, webRedirect: ` ${configured} `}), configured);
for (const platform of ['ios', 'android']) {
  assert.equal(passwordRecoveryRedirect({...args, platform, webRedirect: configured}), nativeRedirect);
}
assert.equal(passwordRecoveryRedirect({...args, browserOrigin: undefined, webRedirect: configured}), configured);
assert.throws(() => passwordRecoveryRedirect({...args, browserOrigin: undefined}), /Open the sign-in/);
assert.equal(passwordRecoveryRedirect({...args, browserOrigin: 'http://localhost:8081'}), 'http://localhost:8081/auth/callback');
for (const webRedirect of [
  'javascript:alert(1)', 'https://user:password@example.com/auth/callback',
  'http://example.com/auth/callback', 'https://example.com/auth/confirmed',
  'https://example.com/auth/callback?redirect=https://other.example.com',
  'https://example.com/auth/callback#anything', 'broken',
]) assert.throws(() => passwordRecoveryRedirect({...args, webRedirect}), /not configured/);

// Execute the real context's reset method with auth doubles, including its redirect wiring.
const context = fs.readFileSync(path.join(root, 'app/context/UserContext.tsx'), 'utf8');
const ast = ts.createSourceFile('UserContext.tsx', context, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let method;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'resetPassword' && node.initializer) method = node.initializer.getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(method, 'real resetPassword method found');
async function resetWith(platform, env, browser, extra = {}, failure = null) {
  const calls = [];
  const globals = {
    Platform: {OS: platform}, Constants: {expoConfig: {extra}},
    process: {env}, PASSWORD_RECOVERY_PAGE_URL: nativeRedirect,
    passwordRecoveryRedirect, cleanEmail: email => email.trim().toLowerCase(),
    toFriendlyAuthError: error => error, console: {warn() {}, log() {}},
    supabase: {auth: {async resetPasswordForEmail(email, options) {calls.push({email, options}); return {error: failure};}}},
  };
  if (browser) globals.window = {location: {origin: browser}};
  const sandbox = execute(`exports.resetPassword = ${method};`, globals);
  try {await sandbox.exports.resetPassword(' User@example.com ');} catch (error) {return {calls, error};}
  return {calls};
}
(async () => {
  for (const [platform, env, origin, extra, expected] of [
    ['web', {}, args.browserOrigin, {}, `${args.browserOrigin}/auth/callback`],
    ['web', {EXPO_PUBLIC_WEB_PASSWORD_RECOVERY_URL: configured}, args.browserOrigin, {}, configured],
    ['web', {}, args.browserOrigin, {EXPO_PUBLIC_WEB_PASSWORD_RECOVERY_URL: configured}, configured],
    ['ios', {EXPO_PUBLIC_WEB_PASSWORD_RECOVERY_URL: configured}, undefined, {}, nativeRedirect],
    ['android', {}, undefined, {}, nativeRedirect],
  ]) {
    const {calls, error} = await resetWith(platform, env, origin, extra);
    assert.equal(error, undefined);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].email, 'user@example.com');
    assert.equal(calls[0].options.redirectTo, expected);
  }
  const noBrowser = await resetWith('web', {}, undefined);
  assert.equal(noBrowser.calls.length, 0);
  assert.match(noBrowser.error.message, /Open the sign-in/);
  const failure = new Error('Rate limited');
  assert.equal((await resetWith('web', {}, args.browserOrigin, {}, failure)).error, failure);
  console.log('PASS: real reset method selects browser callbacks, preserves native bridge, and surfaces failures; no real requests.');
})().catch(error => {console.error(error); process.exitCode = 1;});
