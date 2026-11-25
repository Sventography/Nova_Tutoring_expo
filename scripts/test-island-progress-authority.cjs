const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "app/_lib/islandProgressAuthority.ts"), "utf8");
const moduleShim = { exports: {} };
new Function("module", "exports", ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText)(moduleShim, moduleShim.exports);
const {usesAuthoritativeIslandProgress: enabled, readAuthoritativeIslandProgress: read, isCurrentIslandLoad: current} = moduleShim.exports;
const url = "https://gouhhltupxaycuysdtrw.supabase.co";
const cases = [
  () => assert.equal(enabled(url,"A"),true),
  () => assert.equal(enabled(url+"/","A"),true),
  () => assert.equal(enabled(url,null),false),
  () => assert.equal(enabled("https://other.supabase.co","A"),false),
  () => assert.equal(enabled(url+".evil.example","A"),false),
  () => assert.deepEqual(read({island_xp:50,island_level:2}),{xp:50,level:2}),
  () => assert.deepEqual(read({island_xp:"149",island_level:"1"}),{xp:149,level:1}),
  ...[null,{}, {island_xp:null,island_level:1},{island_xp:-1,island_level:1},{island_xp:150,island_level:1},{island_xp:0,island_level:0},{island_xp:true,island_level:1},{island_xp:0.5,island_level:1},{island_xp:"",island_level:1},{island_xp:"9007199254740992",island_level:1}].map(row=>()=>assert.equal(read(row),null)),
  () => assert.equal(current("A",1,"B",2),false),
  () => assert.equal(current("A",1,"A",3),false),
  () => assert.equal(current("A",3,"A",3),true),
  () => assert.equal(current(null,3,"A",4),false),
];
for(const test of cases)test();
const provider = fs.readFileSync(path.join(root,"app/context/IslandContext.tsx"),"utf8");
const refresh = provider.slice(provider.indexOf("const refreshIsland ="),provider.indexOf("const addIslandXp ="));
assert.ok(refresh.indexOf("if (authoritative)") < refresh.indexOf("AsyncStorage.getItem(storageKey(userId))"));
assert.ok(refresh.includes("setReady(!authoritative || verified)"));
assert.ok(provider.includes('if (authoritative) throw new Error("Registered Island XP requires a verified server operation")'));
assert.ok(provider.includes("if (!ready || authoritative || ownerRef.current !== userId)"));
console.log("PASS: "+(cases.length+4)+" Island authority checks (offline)");
