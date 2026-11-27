'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(file, dependencies) {
  const source = fs.readFileSync(file, 'utf8');
  const js = ts.transpileModule(source, {compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true
  }}).outputText;
  const exports = {};
  new Function('exports', 'require', js)(exports, name => {
    assert.ok(Object.hasOwn(dependencies, name), 'Unexpected dependency ' + name);
    return dependencies[name];
  });
  return exports;
}

async function run() {
  const legacy = () => { throw new Error('Legacy checkout mounted'); };
  for (const closed of [true, false]) {
    const {legacyCheckoutRoute} = load('features/commerce/legacyCheckoutRoute.tsx', {
      react: {createElement: (type, props) => ({type, props})},
      'expo-router': {Redirect: 'Redirect'},
      './staging': {STAGING_CHECKOUT_CLOSED: closed}
    });
    const route = legacyCheckoutRoute(legacy);
    if (closed) assert.deepEqual(route(), {type:'Redirect', props:{href:'/(tabs)/shop'}});
    else assert.equal(route, legacy);
  }

  for (const file of ['app/checkout/success.tsx', 'app/checkout/coin/index.tsx',
    'app/(checkout)/coin.tsx', 'app/_payments.tsx', 'app/payments.tsx', 'app/_buy-coins.tsx',
    'app/(payments)/checkout.tsx', 'app/(tabs)/shop_backup_2026-04-15.tsx', 'app/tabs/shop.tsx']) {
    assert.match(fs.readFileSync(file, 'utf8'), /export default legacyCheckoutRoute\(\w+\)/, file);
  }

  const react = {createElement: (type, props) => ({type, props})};
  const {default: billing} = load('app/billing.tsx', {react, 'expo-router':{Redirect:'Redirect'}});
  assert.deepEqual(billing(), {type:'Redirect', props:{href:'/(tabs)/shop'}});

  // This legacy endpoint must stay closed even when deploy credentials are configured.
  const {default: handler} = load('api/order-email.ts', {});
  const res = {setHeader(){}, status(code){this.code=code;return this;}, json(payload){this.payload=payload;}};
  for (const method of ['GET','OPTIONS','POST']) {
    await handler({method,body:{id:'example', title:'Example item'}}, res);
    assert.equal(res.code,410);
    assert.equal(res.payload.ok,false);
  }
  console.log('PASS staging legacy routes, unverified billing and order email retired.');
}
run().catch(error => { console.error(error);process.exitCode=1; });
