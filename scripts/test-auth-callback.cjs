// Exercise the actual email callback with isolated hooks/auth/storage/browser doubles.
// No credentials, reset emails, or requests leave this process.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.env.NOVA_TEST_ROOT || path.resolve(__dirname, '..');
const ts = require(require.resolve('typescript', {
  paths: [process.env.NOVA_TEST_DEPENDENCIES || root],
}));

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function callback(url, { platform = 'web', existingSession = null, pendingEmail = '' } = {}) {
  const slots = [], effects = [], modules = new Map(), timers = new Map();
  const calls = { auth: [], navigation: [], logs: [], scrub: [], storage: [] };
  let cursor = 0, dirty = false, tree, nextTimer = 1, cleanup;
  let router = { replace: route => calls.navigation.push(route) };
  const browser = {
    location: { href: url },
    history: { state: { previous: true }, replaceState(state, _title, target) {
      calls.scrub.push({ state, target });
      browser.location.href = new URL(target, browser.location.href).href;
    } },
  };
  const jsx = (type, props) => ({ type, props: props || {} });
  const hooks = {
    useRef(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { current: initial };
      return slots[index];
    },
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: initial };
      return [slots[index].value, value => { slots[index].value = value; dirty = true; }];
    },
    useEffect(effect, dependencies) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || dependencies.some((value, i) => value !== previous.dependencies[i])) {
        effects.push(effect);
        slots[index] = { dependencies };
      }
    },
  };
  const auth = {};
  for (const method of ['setSession', 'exchangeCodeForSession', 'verifyOtp', 'refreshSession']) {
    auth[method] = (...args) => {
      const request = deferred();
      calls.auth.push({ method, args, ...request });
      return request.promise;
    };
  }
  auth.getSession = async () => {
    calls.auth.push({ method: 'getSession', args: [] });
    return { data: { session: existingSession }, error: null };
  };
  function load(relative) {
    if (modules.has(relative)) return modules.get(relative);
    const compiled = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
    });
    const sandbox = {
      exports: {}, URL, URLSearchParams,
      window: platform === 'web' ? browser : undefined,
      console: { log: (...args) => calls.logs.push(args), warn: (...args) => calls.logs.push(args) },
      setTimeout(fn, ms) { const id = nextTimer++; timers.set(id, { fn, ms }); return id; },
      clearTimeout(id) { timers.delete(id); },
      fetch() { throw new Error('Callback tests must never send requests'); },
      require(name) {
        if (name === 'react') return { ...hooks, default: hooks };
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'react-native') return {
          Platform: { OS: platform }, StyleSheet: { create: styles => styles },
          ...Object.fromEntries(['ActivityIndicator', 'Pressable', 'Text', 'View'].map(name => [name, name])),
        };
        if (name === 'expo-router') return { useRouter: () => router };
        if (name === 'expo-linking') return { useLinkingURL: () => browser.location.href, getInitialURL: async () => url };
        if (name === '@react-native-async-storage/async-storage') return { default: {
          getItem: async key => {
            calls.storage.push(key);
            if (platform === 'web') assert.equal(new URL(browser.location.href).hash, '', 'Scrub precedes storage awaits');
            return key.includes('pending-confirmation') ? pendingEmail : null;
          },
          removeItem: async () => {},
        } };
        if (name === '../lib/supabase') return { supabase: { auth } };
        if (name === '../_lib/authCallback') return load('app/_lib/authCallback.ts');
        throw new Error('Unexpected import: ' + name);
      },
    };
    vm.runInNewContext(compiled.outputText, sandbox, { filename: relative });
    modules.set(relative, sandbox.exports);
    return sandbox.exports;
  }
  const Component = load('app/auth/callback.tsx').default;
  function render() {
    cursor = 0; dirty = false; tree = Component();
    for (const effect of effects.splice(0)) {
      cleanup?.();
      cleanup = effect();
    }
  }
  function text(node = tree) {
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (!node) return '';
    if (Array.isArray(node)) return node.map(text).join(' ');
    return text(node.props?.children);
  }
  render();
  return {
    calls, browser, text,
    async settle() {
      for (let i = 0; i < 30; i++) {
        await Promise.resolve();
        if (dirty) render();
      }
    },
    rerunEffect() {
      router = { replace: route => calls.navigation.push(route) };
      render();
    },
    continue() {
      function walk(node) {
        if (!node || typeof node !== 'object') return null;
        if (Array.isArray(node)) return node.map(walk).find(Boolean);
        if (node.type === 'Pressable') return node;
        return walk(node.props?.children);
      }
      const button = walk(tree);
      assert.ok(button, 'Callback has a visible continuation');
      button.props.onPress();
    },
    autoContinue() {
      for (const { fn, ms } of timers.values()) if (ms === 1800) fn();
    },
  };
}

async function main() {
  const origin = 'https://nova.example.test';
  for (const suffix of ['?type=recovery', '#type=recovery&access_token=partial', '#type=recovery&refresh_token=partial']) {
    const ui = callback(origin + '/auth/callback' + suffix, { existingSession: { user: { id: 'unrelated' } } });
    await ui.settle();
    assert.match(ui.text(), /reset link is missing its verification details/i);
    assert.equal(ui.calls.auth.length, 0, 'Incomplete recovery must not fall back to an existing session');
    ui.continue();
    assert.equal(ui.calls.navigation[0].pathname, '/sign-in');
  }

  const implicit = callback(origin + '/auth/callback?type=recovery#access_token=private-access&refresh_token=private-refresh');
  assert.equal(implicit.browser.location.href, origin + '/auth/callback', 'Credentials scrubbed synchronously');
  await implicit.settle();
  assert.equal(implicit.calls.auth[0].method, 'setSession');
  assert.equal(implicit.calls.auth[0].args[0].access_token, 'private-access');
  implicit.rerunEffect();
  await implicit.settle();
  assert.equal(implicit.calls.auth.length, 1, 'Effect replay shares the original auth request');
  implicit.calls.auth[0].resolve({ data: { session: { user: { id: 'recovered' } } }, error: null });
  await implicit.settle();
  assert.match(implicit.text(), /Reset link verified/i);
  implicit.rerunEffect();
  implicit.autoContinue();
  assert.equal(implicit.calls.navigation.length, 0, 'Effect cleanup cancels the previous success redirect');
  await implicit.settle();
  assert.equal(implicit.calls.auth.length, 1, 'Completed exchange is not consumed again after URL scrub');
  implicit.continue();
  implicit.autoContinue();
  assert.equal(implicit.calls.navigation[0], '/reset-password');
  assert.equal(implicit.calls.navigation.length, 1, 'Manual continuation cancels automatic redirect');
  assert.doesNotMatch(JSON.stringify(implicit.calls.logs), /private-access|private-refresh/);

  for (const [suffix, method] of [
    ['?type=recovery&code=private-code', 'exchangeCodeForSession'],
    ['?type=recovery&token_hash=private-hash', 'verifyOtp'],
  ]) {
    const ui = callback(origin + '/auth/callback' + suffix);
    await ui.settle();
    assert.equal(ui.calls.auth[0].method, method);
    assert.equal(ui.browser.location.href, origin + '/auth/callback');
    ui.calls.auth[0].resolve({ data: { session: { user: {} } }, error: null });
    await ui.settle();
    assert.match(ui.text(), /Reset link verified/i);
    ui.autoContinue();
    assert.equal(ui.calls.navigation[0], '/reset-password');
  }

  const expired = callback(origin + '/auth/callback#error=access_denied&error_code=otp_expired&error_description=Email+link+expired');
  await expired.settle();
  assert.match(expired.text(), /link has expired/i);
  assert.equal(expired.calls.auth.length, 0);
  assert.equal(expired.browser.location.href, origin + '/auth/callback');

  const rejected = callback(origin + '/auth/callback#type=recovery&access_token=private-access&refresh_token=private-refresh');
  await rejected.settle();
  rejected.calls.auth[0].resolve({ data: { session: null }, error: new Error('Invalid token') });
  await rejected.settle();
  assert.match(rejected.text(), /link is no longer valid/i);
  assert.doesNotMatch(rejected.text(), /Choose New Password/);

  const emptySession = callback(origin + '/auth/callback?type=recovery&code=code');
  await emptySession.settle();
  emptySession.calls.auth[0].resolve({ data: { session: null }, error: null });
  await emptySession.settle();
  assert.match(emptySession.text(), /could not start the password-recovery session/i);

  const native = callback('nova://auth/callback#type=recovery&access_token=native-access&refresh_token=native-refresh', { platform: 'ios' });
  await native.settle();
  assert.equal(native.calls.scrub.length, 0);
  assert.equal(native.calls.auth[0].method, 'setSession');
  native.calls.auth[0].resolve({ data: { session: { user: {} } }, error: null });
  await native.settle();
  assert.match(native.text(), /Reset link verified/i);

  const normal = callback(origin + '/auth/callback', { existingSession: { user: {} } });
  await normal.settle();
  assert.equal(normal.calls.auth[0].method, 'getSession');
  assert.match(normal.text(), /Account confirmed/i, 'Ordinary confirmation fallback is preserved');
  console.log('PASS auth callback: verified recovery only, browser credentials scrubbed, replay safe, expired links visible, native confirmation preserved.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
