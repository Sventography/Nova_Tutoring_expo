// Execute the production client and certificate with fetch, auth and React doubles.
// No network, credentials, Supabase project, or physical collector code is used.
// Run: node scripts/test-collector-client.cjs
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.env.NOVA_TEST_ROOT || path.resolve(__dirname, '..');
const ts = require(path.join(root, 'node_modules/typescript'));
function compile(relative) {
  return ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
}
const clientOutput = compile('app/_lib/collectorClient.ts');
const certificateOutput = compile('app/collector/index.tsx');
const BACKEND = 'https://nove-tutoring-backend.onrender.com';
const CODE = 'COLLECTOR_TEST_ONLY_'.padEnd(43, 'x');
const REWARD = 'noras_last_lantern_017';
const authentic = (claim_state = 'available', serial_number = 17) => ({
  ok: true, authentic: true, edition: 'noras_last_lantern',
  serial_number, edition_size: 100, claim_state,
  reward_id: serial_number === 17 ? REWARD : null,
});

function client(env = {}) {
  const calls = [];
  const responses = [];
  const sandbox = {
    exports: {}, URL, URLSearchParams, process: {env},
    require(name) {
      if (name === 'react-native-url-polyfill') return {URL, URLSearchParams};
      throw Error('Unexpected client import: ' + name);
    },
    fetch: async (url, options) => {
      calls.push({url, options});
      assert.ok(responses.length, 'Unexpected request: no mocked response was provided');
      const next = responses.shift();
      return {
        ok: next.status >= 200 && next.status < 300,
        status: next.status,
        json: async () => {
          if (next.invalidJson) throw Error('Invalid JSON');
          return next.payload;
        },
      };
    },
  };
  vm.runInNewContext(clientOutput, sandbox);
  return {
    api: sandbox.exports, calls,
    respond(payload, status = 200, invalidJson = false) {
      responses.push({payload, status, invalidJson});
    },
  };
}
const enabledClient = () => client({EXPO_PUBLIC_COLLECTOR_REDEMPTION_ENABLED: 'true'});
const rejectsCode = (promise, code, status) => assert.rejects(promise, error =>
  error.name === 'CollectorApiError' && error.code === code && error.status === status);
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {resolve = yes; reject = no;});
  return {promise, resolve, reject};
}

// A small hook runner executes the real certificate component. Requests remain
// pending so tests can switch accounts/links at the dangerous await boundaries.
function certificate({enabled = true, platform = 'web', browser = true,
  url = `https://example.test/collector#code=${CODE}`, params: initialParams = {}} = {}) {
  const slots = [];
  let cursor = 0, pending = [], dirty = false, tree, params = initialParams;
  let account = {isLoggedIn: true, session: {user: {id: 'account-a'}, access_token: 'token-a'}};
  const listeners = new Map();
  const calls = {verify: [], redeem: [], sync: [], navigate: []};
  const hooks = {
    useRef(value) {
      const index = cursor++;
      if (!slots[index]) slots[index] = {current: value};
      return slots[index];
    },
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = {value: typeof initial === 'function' ? initial() : initial};
      return [slots[index].value, value => {
        const next = typeof value === 'function' ? value(slots[index].value) : value;
        if (!Object.is(slots[index].value, next)) {slots[index].value = next; dirty = true;}
      }];
    },
    useEffect(effect, deps) {
      const index = cursor++;
      const old = slots[index];
      if (!old || deps.some((value, i) => !Object.is(value, old.deps[i]))) {
        slots[index] = {deps, cleanup: old?.cleanup};
        pending.push(() => {
          slots[index].cleanup?.();
          slots[index].cleanup = effect();
        });
      }
    },
  };
  const api = enabledClient().api;
  const mockedApi = {
    ...api, COLLECTOR_CLAIMS_ENABLED: enabled,
    verifyCollectorCode(token, code) {
      const request = deferred(); calls.verify.push({token, code, ...request});
      return request.promise;
    },
    redeemCollectorCode(token, code) {
      const request = deferred(); calls.redeem.push({token, code, ...request});
      return request.promise;
    },
  };
  const jsx = (type, props) => ({type, props});
  const sandbox = {exports: {}, require(name) {
    if (name === 'react') return {...hooks, default: hooks};
    if (name === 'react/jsx-runtime') return {jsx, jsxs: jsx, Fragment: 'Fragment'};
    if (name === 'react-native') return {
      Platform: {OS: platform}, StyleSheet: {create: value => value},
      ...Object.fromEntries(['ActivityIndicator', 'ScrollView', 'Text', 'TouchableOpacity', 'View']
        .map(name => [name, name])),
    };
    if (name === 'expo-router') return {
      useRouter: () => ({push(route) {calls.navigate.push(route);}}),
      useLocalSearchParams: () => params,
    };
    if (name === '../context/UserContext') return {useUser: () => account};
    if (name === '../context/IslandDecorationContext') return {useIslandDecorations: () => ({
      getInventoryCount: () => 1,
      refreshCollectorOwnership() {
        const request = deferred(); calls.sync.push(request); return request.promise;
      },
    })};
    if (name === '../_lib/collectorClient') return mockedApi;
    throw Error('Unexpected certificate import: ' + name);
  }};
  if (browser) sandbox.window = {
    location: {href: url},
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: name => listeners.delete(name),
  };
  vm.runInNewContext(certificateOutput, sandbox);
  function render(flushEffects = true) {
    let iterations = 0;
    do {
      assert.ok(iterations++ < 20, 'Certificate rendered too many times');
      cursor = 0; dirty = false; tree = sandbox.exports.default();
      if (!flushEffects) break;
      const effects = pending; pending = [];
      effects.forEach(effect => effect());
    } while (dirty || pending.length);
    return tree;
  }
  return {
    calls, render,
    setAccount(id, token = `token-${id}`) {
      account = id ? {isLoggedIn: true, session: {user: {id}, access_token: token}}
        : {isLoggedIn: false, session: null};
    },
    setParams(next) {params = next;},
    setUrl(next) {sandbox.window.location.href = next; listeners.get('hashchange')?.();},
    async settle() {
      // Flush the component's .then/.catch continuations, then its effects.
      for (let i = 0; i < 5; i++) {await Promise.resolve(); render();}
      return tree;
    },
    unmount() {slots.forEach(slot => slot.cleanup?.());},
  };
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
function text(tree) {
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree);
  if (!tree || typeof tree !== 'object') return '';
  if (Array.isArray(tree)) return tree.map(text).join('');
  return text(tree.props?.children);
}
function button(tree, label) {
  return nodes(tree).find(node => node.type === 'TouchableOpacity' && text(node) === label);
}

(async () => {
  for (const flag of [undefined, 'false', 'TRUE', '1', '']) {
    const c = client({EXPO_PUBLIC_COLLECTOR_REDEMPTION_ENABLED: flag});
    assert.equal(c.api.COLLECTOR_CLAIMS_ENABLED, false);
    await rejectsCode(c.api.verifyCollectorCode('test-token', CODE), 'redemption_not_enabled', 503);
    await rejectsCode(c.api.redeemCollectorCode('test-token', CODE), 'redemption_not_enabled', 503);
    assert.equal(c.calls.length, 0);
    c.respond({ok: true, entitlements: []});
    assert.equal((await c.api.fetchCollectorEntitlements('test-token')).length, 0);
    assert.equal(c.calls[0].options.method, 'GET');
  }

  for (const base of ['http://nove-tutoring-backend.onrender.com', 'https://unapproved.example',
    'https://staging.example', `${BACKEND}/path`, `${BACKEND}?forward=1`,
    `${BACKEND}#fragment`, 'https://user:password@nove-tutoring-backend.onrender.com']) {
    const c = client({EXPO_PUBLIC_BACKEND_URL: base, EXPO_PUBLIC_COLLECTOR_REDEMPTION_ENABLED: 'true'});
    await rejectsCode(c.api.fetchCollectorEntitlements('test-token'), 'collector_not_configured', 503);
    await rejectsCode(c.api.verifyCollectorCode('test-token', CODE), 'collector_not_configured', 503);
    assert.equal(c.calls.length, 0, 'Unapproved backend must not receive an auth token');
  }

  const c = enabledClient();
  for (const invalid of [null, 17, [], '', 'too-short', 'a'.repeat(129), `${CODE}\n`, `${CODE}?x=1`]) {
    assert.equal(c.api.validCollectorCode(invalid), false);
    await rejectsCode(c.api.verifyCollectorCode('test-token', invalid), 'invalid_code', 400);
    await rejectsCode(c.api.redeemCollectorCode('test-token', invalid), 'invalid_code', 400);
  }
  for (const token of ['', '   ', null]) {
    await rejectsCode(c.api.fetchCollectorEntitlements(token), 'unauthorized', 401);
    await rejectsCode(c.api.verifyCollectorCode(token, CODE), 'unauthorized', 401);
    await rejectsCode(c.api.redeemCollectorCode(token, CODE), 'unauthorized', 401);
  }
  assert.equal(c.calls.length, 0);

  c.respond({ok: true, entitlements: [
    {reward_id: REWARD, granted_at: '2026-10-30T15:00:00+00:00', ignored: 'field'},
    null, {reward_id: REWARD, granted_at: 'not-a-date'},
    {reward_id: 'unrelated-reward', granted_at: '2026-10-30T15:00:00Z'},
  ]});
  const grants = await c.api.fetchCollectorEntitlements('test-token');
  assert.deepEqual(JSON.parse(JSON.stringify(grants)), [
    {reward_id: REWARD, granted_at: '2026-10-30T15:00:00+00:00'},
  ]);
  assert.equal(c.calls[0].url, `${BACKEND}/api/collector/entitlements`);
  assert.equal(c.calls[0].options.headers.Authorization, 'Bearer test-token');
  assert.equal(c.calls[0].options.redirect, 'error');
  assert.equal(c.calls[0].options.cache, 'no-store');
  assert.equal(c.calls[0].options.body, undefined);

  for (const [payload, status, expected] of [
    [{ok: false, error: 'unauthorized'}, 401, 'unauthorized'],
    [{ok: false, error: 'too_many_attempts'}, 429, 'too_many_attempts'],
    [{ok: false}, 503, 'server_error'],
    [{ok: true}, 200, 'invalid_server_response'],
    [{ok: true, entitlements: {}}, 200, 'invalid_server_response'],
    [null, 200, 'invalid_server_response'],
    [['not-an-object'], 200, 'invalid_server_response'],
  ]) {
    c.respond(payload, status);
    await rejectsCode(c.api.fetchCollectorEntitlements('test-token'), expected, status);
  }
  c.respond(null, 502, true);
  await rejectsCode(c.api.fetchCollectorEntitlements('test-token'), 'invalid_server_response', 502);

  for (const [serial, state] of [[17, 'available'], [17, 'yours'], [23, 'available'], [23, 'claimed']]) {
    c.respond(authentic(state, serial));
    const verified = await c.api.verifyCollectorCode('test-token', CODE);
    assert.equal(verified.serial_number, serial);
    assert.equal(verified.reward_id, serial === 17 ? REWARD : null);
  }
  const request = c.calls.at(-1);
  assert.equal(request.url, `${BACKEND}/api/collector/verify`);
  assert.equal(request.options.method, 'POST');
  assert.deepEqual(JSON.parse(request.options.body), {code: CODE});
  assert.equal(request.options.headers.apikey, undefined);
  assert.equal(request.url.includes(CODE), false);
  for (const patch of [
    {authentic: false}, {edition: 'other'}, {serial_number: 0}, {serial_number: 101},
    {serial_number: 17.5}, {serial_number: '17'}, {edition_size: 99},
    {claim_state: 'unknown'}, {claim_state: ['available']}, {reward_id: null},
    {serial_number: 23, reward_id: REWARD},
  ]) {
    c.respond({...authentic(), ...patch});
    await rejectsCode(c.api.verifyCollectorCode('test-token', CODE), 'invalid_server_response', 200);
  }
  for (const status of ['claimed', 'already_yours']) {
    c.respond({ok: true, status, reward_id: REWARD});
    assert.equal(await c.api.redeemCollectorCode('test-token', CODE), status);
  }
  for (const result of [
    {status: 'claimed', reward_id: null}, {status: 'available', reward_id: REWARD},
    {status: ['claimed'], reward_id: REWARD},
  ]) {
    c.respond({ok: true, ...result});
    await rejectsCode(c.api.redeemCollectorCode('test-token', CODE), 'invalid_server_response', 200);
  }
  const configured = client({EXPO_PUBLIC_BACKEND_URL: ` ${BACKEND}/// `});
  configured.respond({ok: true, entitlements: []});
  await configured.api.fetchCollectorEntitlements('test-token');
  assert.equal(configured.calls[0].url, `${BACKEND}/api/collector/entitlements`);

  const parse = c.api.collectorCodeFromUrl;
  assert.equal(parse(`https://example.test/collector#code=${CODE}`), CODE);
  assert.equal(parse(`https://example.test/collector#code=${CODE}?utm_source=share`), CODE);
  assert.equal(parse(`https://example.test/collector?code=${CODE}`), null);
  assert.equal(parse(`https://example.test/collector?code=${CODE}#code=bad`), null);
  assert.equal(parse(`nova://collector?code=${CODE}`, 'native'), CODE);
  assert.equal(parse(`https://example.test/collector?code=${CODE}`, 'native'), null);
  for (const url of [null, '', 'not a url', 'https://example.test/collector#code=bad']) {
    assert.equal(parse(url), null);
  }

  const disabled = certificate({enabled: false});
  assert.match(text(disabled.render()), /verification and redemption are not open yet/);
  assert.equal(disabled.calls.verify.length, 0);
  const serverRender = certificate({browser: false});
  assert.match(text(serverRender.render()), /SEALED ARCHIVE/);
  assert.equal(serverRender.calls.verify.length, 0);
  const query = certificate({url: `https://example.test/collector?code=${CODE}`, params: {code: CODE}});
  assert.match(text(query.render()), /incomplete or invalid/);
  assert.equal(query.calls.verify.length, 0);
  const signedOut = certificate();
  signedOut.setAccount(null);
  const loginButton = button(signedOut.render(), 'Sign in to Nova');
  assert.ok(loginButton, 'The standalone certificate must provide a sign-in action');
  loginButton.props.onPress();
  assert.deepEqual(signedOut.calls.navigate, ['/sign-in?mode=login']);
  assert.equal(signedOut.calls.navigate[0].includes(CODE), false);
  assert.match(text(signedOut.render()), /scan or reopen this QR link/);

  const changedLink = certificate();
  changedLink.render();
  assert.equal(changedLink.calls.verify.length, 1);
  changedLink.setUrl('https://example.test/collector#code=bad');
  assert.match(text(changedLink.render()), /incomplete or invalid/);
  changedLink.calls.verify[0].resolve(authentic('yours'));
  assert.doesNotMatch(text(await changedLink.settle()), /belongs to your account/);

  const native = certificate({platform: 'ios', browser: false, params: {code: CODE}});
  native.render();
  assert.equal(native.calls.verify.length, 1);
  native.setParams({});
  native.calls.verify[0].resolve(authentic('yours'));
  assert.match(text(await native.settle()), /incomplete or invalid/);

  const switched = certificate();
  switched.render();
  switched.setAccount('account-b', 'token-b');
  switched.render();
  assert.equal(switched.calls.verify.length, 2);
  switched.calls.verify[0].resolve(authentic('yours'));
  assert.doesNotMatch(text(await switched.settle()), /AUTHENTIC COLLECTOR EDITION/);
  switched.calls.verify[1].resolve(authentic('claimed'));
  assert.match(text(await switched.settle()), /already been redeemed/);

  const staleAction = certificate();
  staleAction.render();
  staleAction.calls.verify[0].resolve(authentic());
  const oldClaim = button(await staleAction.settle(), "Claim Nora's Last Lantern");
  assert.ok(oldClaim);
  staleAction.setAccount('account-b');
  assert.equal(button(staleAction.render(false), "Claim Nora's Last Lantern"), undefined);
  await oldClaim.props.onPress();
  assert.equal(staleAction.calls.redeem.length, 0, 'An old rendered action must not claim for another account');
  staleAction.render();

  const claiming = certificate();
  claiming.render(); claiming.calls.verify[0].resolve(authentic());
  const claimButton = button(await claiming.settle(), "Claim Nora's Last Lantern");
  const claimPromise = claimButton.props.onPress();
  const duplicatePromise = claimButton.props.onPress();
  assert.equal(claiming.calls.redeem.length, 1, 'Double taps share one in-flight claim');
  claiming.setAccount('account-b'); claiming.render();
  claiming.calls.redeem[0].resolve('claimed');
  await Promise.all([claimPromise, duplicatePromise]);
  assert.equal(claiming.calls.sync.length, 0, 'Do not sync the next account after an old claim finishes');
  assert.doesNotMatch(text(await claiming.settle()), /Castle unlocked|belongs to your account/);

  const syncing = certificate();
  syncing.render(); syncing.calls.verify[0].resolve(authentic('yours'));
  const syncPromise = button(await syncing.settle(), 'Sync to my island').props.onPress();
  assert.equal(syncing.calls.sync.length, 1);
  syncing.setAccount(null); syncing.render();
  syncing.calls.sync[0].resolve(true); await syncPromise;
  assert.doesNotMatch(text(await syncing.settle()), /Castle ready|belongs to your account/);

  const claimed = certificate();
  claimed.render(); claimed.calls.verify[0].resolve(authentic());
  const completedClaim = button(await claimed.settle(), "Claim Nora's Last Lantern").props.onPress();
  claimed.calls.redeem[0].resolve('claimed');
  await claimed.settle();
  assert.equal(claimed.calls.sync.length, 1);
  claimed.calls.sync[0].resolve(true); await completedClaim;
  const ownedPage = await claimed.settle();
  assert.match(text(ownedPage), /belongs to your account/);
  assert.match(text(ownedPage), /Decoration Inventory/);
  button(ownedPage, 'Open my island').props.onPress();
  assert.deepEqual(claimed.calls.navigate, ['/(tabs)/island']);

  const backAgain = certificate();
  backAgain.render();
  backAgain.setAccount('account-b', 'token-b'); backAgain.render();
  backAgain.setAccount('account-a', 'token-a'); backAgain.render();
  backAgain.calls.verify[0].resolve(authentic('yours'));
  assert.doesNotMatch(text(await backAgain.settle()), /AUTHENTIC COLLECTOR EDITION/);
  backAgain.calls.verify[2].resolve(authentic());
  assert.ok(button(await backAgain.settle(), "Claim Nora's Last Lantern"));

  const unmounted = certificate();
  unmounted.render(); unmounted.unmount();
  unmounted.calls.verify[0].resolve(authentic('yours'));
  await Promise.resolve(); await Promise.resolve();

  console.log('PASS: production API gates, auth/destination checks, response validation, QR parsing, static rendering, and account/link/claim races.');
})().catch(error => {console.error(error); process.exitCode = 1;});
