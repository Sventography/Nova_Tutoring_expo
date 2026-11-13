// Execute the real provider with local hook, storage, account, and API doubles.
// No credentials, network calls, or production data. Geometry has its own tests.
// Run: node scripts/test-collector-ownership.cjs
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.env.NOVA_TEST_ROOT || path.resolve(__dirname, '..');
const ts = require(path.join(root, 'node_modules/typescript'));
const reward = 'noras_last_lantern_017';
const storageKey = id => `@island/decorations/state.v1:${id || 'guest'}`;
const placement = (itemId, id, x = 10) => ({
  placementId: id, itemId, transform: {x, z: -10, rotationY: 0, scale: 1},
  placedAt: 123, updatedAt: 123,
});
const snapshot = (owned = true) => ({
  version: 1, ownedCounts: {bench: 2, ...(owned ? {[reward]: 1} : {})},
  placements: [placement('bench', 'bench'), ...(owned ? [placement(reward, 'castle')] : [])],
  updatedAt: 123,
});
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {resolve = yes; reject = no;});
  return {promise, resolve, reject};
};
const owned = [{reward_id: reward, granted_at: '2026-01-01T00:00:00Z'}];

function providerHarness(account = 'owner', initial = snapshot()) {
  const hooks = [];
  const effects = [];
  const requests = [];
  const values = new Map([[storageKey(account), JSON.stringify(initial)]]);
  const writes = [];
  const coinCalls = [];
  let currentAccount = account;
  let token = account ? `${account}-token` : null;
  let hookIndex = 0, queued = false, value;
  let writeGate = null;
  let castleObstacle = null;
  const setCollectorCastleObstacle = obstacle => {castleObstacle = obstacle;};
  const equalDeps = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const schedule = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {queued = false; render();});
  };
  const React = {
    createContext: () => ({Provider: 'Provider'}),
    createElement: (type, props, ...children) => ({type, props: {...props, children}}),
    useContext: () => {throw Error('Unexpected useContext');},
    useState(initialState) {
      const i = hookIndex++;
      if (!hooks[i]) hooks[i] = {value: typeof initialState === 'function' ? initialState() : initialState};
      return [hooks[i].value, next => {
        const resolved = typeof next === 'function' ? next(hooks[i].value) : next;
        if (!Object.is(resolved, hooks[i].value)) {hooks[i].value = resolved; schedule();}
      }];
    },
    useRef(initialValue) {
      const i = hookIndex++;
      return hooks[i] || (hooks[i] = {current: initialValue});
    },
    useMemo(make, deps) {
      const i = hookIndex++;
      if (!hooks[i] || !equalDeps(hooks[i].deps, deps)) hooks[i] = {deps, value: make()};
      return hooks[i].value;
    },
    useCallback(callback, deps) {return React.useMemo(() => callback, deps);},
    useEffect(callback, deps) {
      const i = hookIndex++;
      if (!hooks[i] || !equalDeps(hooks[i].deps, deps)) {
        const previous = hooks[i];
        hooks[i] = {deps, cleanup: previous?.cleanup};
        effects.push(() => {previous?.cleanup?.(); hooks[i].cleanup = callback();});
      }
    },
  };
  const catalog = [
    {id: 'bench', title: 'Bench', price: 10, model: 'bench'},
    {id: reward, title: 'Castle', price: 0, model: 'noras_last_lantern', collectorOnly: true},
  ];
  const exports = {};
  const output = ts.transpileModule(fs.readFileSync(path.join(root, 'app/context/IslandDecorationContext.tsx'), 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true},
  }).outputText;
  vm.runInNewContext(output, {exports, console: {warn() {}}, require(name) {
    if (name === 'react') return React;
    if (name === '@react-native-async-storage/async-storage') return {
      getItem: async key => values.get(key) ?? null,
      setItem: async (key, serialized) => {
        writes.push({key, state: JSON.parse(serialized)});
        if (writeGate) await writeGate.promise;
        values.set(key, serialized);
      },
    };
    if (name === '../_lib/islandDecorationCatalog') return {
      ISLAND_DECORATION_CATALOG: catalog,
      ISLAND_DECORATION_CATALOG_BY_ID: Object.fromEntries(catalog.map(item => [item.id, item])),
      isIslandDecorationCoinShopItem: item => !item.collectorOnly,
    };
    if (name === '../_lib/islandBuilderBounds') return {clampIslandBuildPosition: (x, z) => ({x, z})};
    if (name === '../_lib/islandAutoPlacement') return {
      COLLECTOR_CASTLE_PREFERRED_GROUND: {x: 10, z: -10},
      NOVA_PEDESTAL_GROUND_OBSTACLE: {x: -3, z: 1.6, radius: 2.75},
      decorationGroundRadius: () => 1, landmarkGroundRadius: () => 1,
      findNearestFreeGround: preferred => ({x: preferred.x, z: preferred.z}),
    };
    if (name === '../_lib/collectorClient') return {
      COLLECTOR_REWARD_ID: reward,
      fetchCollectorEntitlements: accessToken => {
        const response = deferred(); requests.push({accessToken, ...response}); return response.promise;
      },
    };
    if (name === './CoinsContext') return {useCoins: () => ({coins: 100, ready: true, addCoins: async (...args) => coinCalls.push(args)})};
    if (name === './IslandBuilderContext') return {useIslandBuilder: () => ({placements: [], setCollectorCastleObstacle})};
    if (name === './UserContext') return {useUser: () => ({supabaseUserId: currentAccount, ready: true, session: token ? {access_token: token, user: {id: currentAccount}} : null})};
    throw Error('Unexpected import: ' + name);
  }});
  function render() {
    hookIndex = 0;
    value = exports.IslandDecorationProvider({children: null}).props.value;
    while (effects.length) effects.shift()();
  }
  render();
  return {
    get value() {return value;}, requests, values, writes, coinCalls,
    get castleObstacle() {return castleObstacle;},
    async settle() {for (let i = 0; i < 16; i++) await Promise.resolve();},
    switchAccount(id, nextToken = id ? `${id}-token` : null) {currentAccount = id; token = nextToken; render();},
    blockWrites() {writeGate = deferred(); return writeGate;},
    unblockWrites() {writeGate?.resolve(); writeGate = null;},
  };
}

(async () => {
  const owner = providerHarness();
  await owner.settle();
  assert.equal(owner.value.placements.some(p => p.itemId === reward), false, 'Cached castle is hidden before API confirmation');
  assert.equal(owner.value.getInventoryCount(reward), 0);
  assert.equal(owner.castleObstacle, null);
  owner.requests[0].resolve(owned);
  await owner.settle();
  assert.equal(owner.value.placements.filter(p => p.itemId === reward).length, 1);
  assert.equal(owner.castleObstacle.x, 10, 'Only verified active castle protects against landmark placement');
  owner.value.startEditing(); await owner.settle();
  assert.equal((await owner.value.buyDecoration(reward)).reason, 'not_for_sale');
  assert.equal(owner.coinCalls.length, 0, 'Castle purchase never spends or grants coins');

  const refresh = owner.value.refreshCollectorOwnership();
  assert.equal(owner.value.movePlacement('bench', {x: 15}), true);
  owner.requests.at(-1).resolve(owned);
  await refresh; await owner.settle();
  assert.equal(owner.value.placements.find(p => p.placementId === 'bench').transform.x, 15, 'Ownership refresh preserves in-flight draft edits');
  const offline = owner.value.refreshCollectorOwnership();
  owner.requests.at(-1).reject(Error('offline'));
  await offline; await owner.settle();
  assert.equal(owner.value.placements.some(p => p.itemId === reward), false);
  assert.equal(owner.castleObstacle, null, 'Unverified castle cannot leave an invisible builder obstacle');
  assert.equal(JSON.parse(owner.values.get(storageKey('owner'))).placements.some(p => p.itemId === reward), true, 'Outage preserves cached castle layout');
  const recover = owner.value.refreshCollectorOwnership(); owner.requests.at(-1).resolve(owned);
  await recover; await owner.settle();
  assert.equal(owner.value.placements.find(p => p.placementId === 'castle').transform.x, 10);
  assert.equal(owner.value.placements.find(p => p.placementId === 'bench').transform.x, 15);

  // Same-account token replacement and account switches invalidate old requests.
  const oldTokenRefresh = owner.value.refreshCollectorOwnership();
  const oldTokenRequest = owner.requests.at(-1);
  owner.switchAccount('owner', 'renewed-token');
  assert.equal(owner.value.placements.some(p => p.itemId === reward), false);
  await owner.settle(); owner.requests.at(-1).resolve([]);
  await owner.settle(); oldTokenRequest.resolve(owned); await oldTokenRefresh; await owner.settle();
  assert.equal(owner.value.placements.some(p => p.itemId === reward), false);
  assert.equal(JSON.parse(owner.values.get(storageKey('owner'))).ownedCounts[reward], undefined);

  const switcher = providerHarness('a'); await switcher.settle();
  const aRequest = switcher.requests[0];
  switcher.values.set(storageKey('b'), JSON.stringify(snapshot(false)));
  switcher.switchAccount('b');
  assert.equal(switcher.value.placements.length, 0, 'Previous account snapshot is hidden synchronously');
  await switcher.settle(); switcher.requests.at(-1).resolve([]);
  await switcher.settle(); aRequest.resolve(owned); await switcher.settle();
  assert.equal(switcher.value.placements.some(p => p.itemId === reward), false);
  assert.equal(switcher.writes.some(w => w.key === storageKey('b') && w.state.ownedCounts[reward]), false);

  const latest = providerHarness(); await latest.settle(); latest.requests[0].resolve(owned); await latest.settle();
  const earlier = latest.value.refreshCollectorOwnership(); const earlierRequest = latest.requests.at(-1);
  const later = latest.value.refreshCollectorOwnership(); latest.requests.at(-1).resolve([]);
  await later; earlierRequest.resolve(owned); await earlier; await latest.settle();
  assert.equal(latest.value.placements.some(p => p.itemId === reward), false, 'Older response cannot restore revoked ownership');

  const saving = providerHarness(); await saving.settle(); saving.requests[0].resolve(owned); await saving.settle();
  saving.value.startEditing(); await saving.settle();
  saving.blockWrites(); const save = saving.value.saveEditing(); await saving.settle();
  const revoke = saving.value.refreshCollectorOwnership(); saving.requests.at(-1).resolve([]);
  await revoke; await saving.settle(); saving.unblockWrites(); await save; await saving.settle();
  assert.equal(saving.value.placements.some(p => p.itemId === reward), false, 'Slow SAVE cannot restore a revoked castle');
  assert.equal(saving.value.isEditing, true, 'Reconciled draft stays open instead of being overwritten by slow SAVE');
  assert.equal(JSON.parse(saving.values.get(storageKey('owner'))).ownedCounts[reward], undefined);

  const fresh = providerHarness('new-owner', snapshot(false)); await fresh.settle();
  fresh.requests[0].resolve(owned); await fresh.settle();
  assert.equal(fresh.value.getInventoryCount(reward), 1, 'New entitlement enters inventory without auto placement');
  fresh.value.startEditing(); await fresh.settle();
  assert.ok(fresh.value.placeFromInventory(reward)); await fresh.settle();
  assert.equal(fresh.value.placeFromInventory(reward), null, 'Unique castle cannot duplicate');
  assert.equal(await fresh.value.saveEditing(), true); await fresh.settle();
  assert.equal(fresh.value.committedPlacements.filter(p => p.itemId === reward).length, 1);
  fresh.value.startEditing(); await fresh.settle();
  assert.equal((await fresh.value.buyDecoration('bench')).ok, true, 'Existing coin shop still works'); await fresh.settle();
  assert.equal(fresh.coinCalls[0][0], -10);

  const guest = providerHarness(null); await guest.settle();
  assert.equal(guest.requests.length, 0, 'Guest does not call authenticated ownership API');
  assert.equal(guest.value.getInventoryCount(reward), 0);
  assert.equal(guest.value.placements.some(p => p.itemId === reward), false);
  console.log('PASS: server-only ownership; cached/offline layouts; account and token isolation; stale response rejection; draft/SAVE races; unique inventory; existing coin purchases.');
})().catch(error => {console.error(error); process.exitCode = 1;});
