// Execute the real auth screens and alert hook with React/native/auth doubles.
// No requests, reset emails, credentials, or password changes leave this process.
// Run: node scripts/test-auth-recovery-ui.cjs
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

function screen(relative, { platform = 'web', session = null } = {}) {
  const slots = [], modules = new Map();
  let cursor = 0, dirty = false, tree;
  const calls = { reset: [], login: [], update: [], navigate: [], nativeAlerts: [] };
  const hooks = {
    useRef(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { current: initial };
      return slots[index];
    },
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[index].value, value => {
        slots[index].value = typeof value === 'function' ? value(slots[index].value) : value;
        dirty = true;
      }];
    },
  };
  const auth = { ready: true, session };
  for (const [method, target] of [
    ['resetPassword', 'reset'], ['loginWithEmailPassword', 'login'], ['updatePassword', 'update'],
  ]) {
    auth[method] = (...args) => {
      const request = deferred();
      calls[target].push({ args, ...request });
      return request.promise;
    };
  }
  auth.signUpWithEmailPassword = () => { throw Error('Unexpected signup'); };

  const jsx = (type, props) => ({ type, props: props || {} });
  function load(file) {
    if (modules.has(file)) return modules.get(file);
    const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
      },
    });
    const sandbox = {
      exports: {}, console: { log() {}, warn() {} },
      setTimeout(callback) { queueMicrotask(callback); return 1; }, clearTimeout() {},
      fetch() { throw Error('Auth UI tests must not send network requests'); },
      require(name) {
        if (name === 'react') return { ...hooks, default: hooks };
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
        if (name === 'react-native') return {
          Platform: { OS: platform }, StyleSheet: { create: value => value },
          // Exactly the browser behavior that originally hid all feedback.
          Alert: { alert: (...args) => { if (platform !== 'web') calls.nativeAlerts.push(args); } },
          ...Object.fromEntries(['ActivityIndicator', 'KeyboardAvoidingView', 'Modal',
            'Pressable', 'SafeAreaView', 'ScrollView', 'Text', 'TextInput',
            'TouchableOpacity', 'View'].map(name => [name, name])),
        };
        if (name === 'expo-router') return {
          useRouter: () => ({ replace: route => calls.navigate.push(route) }),
          useLocalSearchParams: () => ({ mode: 'login' }),
        };
        if (name === 'expo-linear-gradient') return { LinearGradient: 'LinearGradient' };
        if (name === 'expo-haptics') return { impactAsync: async () => {}, ImpactFeedbackStyle: { Medium: 'medium' } };
        if (name === 'expo-linking') return { openURL: async () => {} };
        if (name === '@react-native-async-storage/async-storage') return {
          default: { setItem: async () => {}, removeItem: async () => {} },
        };
        if (name.endsWith('/context/UserContext')) return { useUser: () => auth };
        if (name.endsWith('/context/ThemeContext')) return { useTheme: () => ({ tokens: { gradient: ['black', 'navy'] } }) };
        if (name.endsWith('/utils/toast')) return { showToast() {} };
        if (name.endsWith('/constants/community')) return { DISCORD_INVITE_URL: 'https://example.test/discord' };
        if (name.endsWith('/_lib/useAuthAlert')) return load(path.resolve(path.dirname(file), name + '.tsx'));
        throw Error('Unexpected import: ' + name);
      },
    };
    vm.runInNewContext(output.outputText, sandbox, { filename: file });
    modules.set(file, sandbox.exports);
    return sandbox.exports;
  }
  const Component = load(path.join(root, relative)).default;
  function render() { cursor = 0; dirty = false; tree = Component(); }
  function nodes() {
    const result = [];
    function walk(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(walk);
      if (node.type === 'Modal' && !node.props.visible) return;
      result.push(node);
      walk(node.props.children);
    }
    walk(tree);
    return result;
  }
  function textOf(node) {
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (!node) return '';
    if (Array.isArray(node)) return node.map(textOf).join('');
    return textOf(node.props?.children);
  }
  render();
  return {
    calls, auth,
    async settle() {
      for (let i = 0; i < 12; i++) {
        await Promise.resolve();
        if (dirty) render();
      }
    },
    text() { return nodes().filter(node => node.type === 'Text').map(textOf).join('\n'); },
    input(index, value) {
      const field = nodes().filter(node => node.type === 'TextInput')[index];
      assert.ok(field, 'Input ' + index + ' exists');
      field.props.onChangeText(value);
      render();
    },
    button(label) {
      const matches = nodes().filter(node =>
        ['Pressable', 'TouchableOpacity'].includes(node.type) &&
        (node.props.accessibilityLabel || textOf(node)) === label);
      assert.ok(matches.length, 'Visible button exists: ' + label + '\n' + this.text());
      return matches.at(-1);
    },
    press(label) { return this.button(label).props.onPress(); },
    dismiss() { this.press('OK'); render(); },
  };
}

async function resetRequestChecks(relative, label) {
  const ui = screen(relative);
  assert.equal(ui.calls.reset.length, 0, 'Mount never sends a reset email');
  ui.press(label);
  await ui.settle();
  assert.match(ui.text(), /Enter your email/i);
  assert.equal(ui.calls.reset.length, 0, 'Blank email makes no request');
  ui.dismiss();

  ui.input(0, 'not-an-email');
  ui.press(label);
  await ui.settle();
  assert.match(ui.text(), /valid email address/i);
  assert.equal(ui.calls.reset.length, 0, 'Invalid email makes no request');
  ui.dismiss();

  ui.input(0, ' owner@example.test ');
  const press = ui.button(label).props.onPress;
  press(); press();
  assert.equal(ui.calls.reset.length, 1, 'Synchronous double click starts one request');
  await ui.settle();
  const pendingLabel = label === 'Forgot Password?' ? 'Sending reset email…' : 'Sending...';
  assert.equal(ui.button(pendingLabel).props.disabled, true, 'Pending request is visible and disabled');
  ui.calls.reset[0].resolve();
  await ui.settle();
  assert.match(ui.text(), /If an account exists for this email/i, 'Success does not reveal account existence');
  assert.equal(ui.calls.nativeAlerts.length, 0, 'Web feedback does not rely on RN Alert');
  ui.dismiss();

  ui.press(label);
  assert.equal(ui.calls.reset.length, 2, 'Completed request unlocks retry');
  ui.calls.reset[1].reject(new Error('Email service is temporarily unavailable.'));
  await ui.settle();
  assert.match(ui.text(), /Email service is temporarily unavailable/, 'Request failure is visible');
  ui.dismiss();
  assert.equal(ui.button(label).props.disabled, false);
}

(async () => {
  await resetRequestChecks('app/sign-in.tsx', 'Forgot Password?');
  await resetRequestChecks('app/(auth)/forgot.tsx', 'Send Reset Email');

  const login = screen('app/sign-in.tsx');
  login.press('Log In');
  await login.settle();
  assert.match(login.text(), /Please enter your email and password/);
  login.dismiss();
  login.input(0, ' Owner@Example.Test ');
  login.input(1, 'private-test-password');
  login.press('Log In');
  await login.settle();
  assert.deepEqual(login.calls.login[0].args, ['owner@example.test', 'private-test-password']);
  login.calls.login[0].reject(new Error('Incorrect email or password.'));
  await login.settle();
  assert.match(login.text(), /Login error/);
  assert.match(login.text(), /Incorrect email or password/);
  login.dismiss();

  login.press('Sign Up');
  await login.settle();
  login.press('Create Account');
  await login.settle();
  assert.match(login.text(), /Please fill out all fields/, 'Signup validation is visible on web too');
  login.dismiss();
  login.press('Log In');
  await login.settle();
  login.press('Log In');
  await login.settle();
  login.calls.login[1].reject(new Error('Please confirm your email.'));
  await login.settle();
  login.press('Enter Code');
  assert.equal(login.calls.navigate[0].pathname, '/confirm-email', 'Web alert action callbacks still work');

  const reset = screen('app/reset-password.tsx');
  reset.press('Update Password');
  await reset.settle();
  assert.match(reset.text(), /Reset link required/);
  assert.equal(reset.calls.update.length, 0);
  reset.dismiss();
  reset.auth.session = { user: { id: 'test-user' } };
  reset.input(0, 'short');
  reset.input(1, 'short');
  reset.press('Update Password');
  await reset.settle();
  assert.match(reset.text(), /Password too short/);
  reset.dismiss();
  reset.input(0, 'new-test-password');
  reset.input(1, 'different-password');
  reset.press('Update Password');
  await reset.settle();
  assert.match(reset.text(), /Passwords do not match/);
  reset.dismiss();
  reset.input(1, 'new-test-password');
  const submit = reset.button('Update Password').props.onPress;
  submit(); submit();
  assert.equal(reset.calls.update.length, 1, 'Password submission also locks synchronously');
  await reset.settle();
  assert.equal(reset.button('Updating password').props.disabled, true, 'Password pending state is accessible and disabled');
  assert.equal(reset.button('Updating password').props.accessibilityState.busy, true);
  reset.calls.update[0].reject(new Error('Recovery session expired.'));
  await reset.settle();
  assert.match(reset.text(), /Recovery session expired/);
  reset.dismiss();
  reset.press('Update Password');
  reset.calls.update[1].resolve();
  await reset.settle();
  assert.match(reset.text(), /Password updated!/);
  assert.equal(reset.calls.navigate.length, 0, 'Success stays visible until Continue');
  const continuePress = reset.button('Continue').props.onPress;
  continuePress(); continuePress();
  assert.deepEqual(reset.calls.navigate, ['/(tabs)/account']);

  const native = screen('app/reset-password.tsx', {
    platform: 'ios', session: { user: { id: 'test-user' } },
  });
  native.input(0, 'new-test-password');
  native.input(1, 'new-test-password');
  native.press('Update Password');
  native.calls.update[0].resolve();
  await native.settle();
  assert.equal(native.calls.nativeAlerts[0][0], 'Password updated!');
  native.calls.nativeAlerts[0][2][0].onPress();
  assert.deepEqual(native.calls.navigate, ['/(tabs)/account'], 'Native Alert action is preserved');
  console.log('PASS: real auth screens show browser validation/errors/success with no-op RN Alert; reset requests and password submissions lock pending double clicks; Continue works on web and native.');
})().catch(error => { console.error(error); process.exitCode = 1; });
