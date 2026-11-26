const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const path = require('node:path');
function load(file) {
  const code = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const mod={exports:{}};
  new Function('module','exports','require',code)(mod,mod.exports,id=>load(path.resolve(path.dirname(file),id+'.ts')));
  return mod.exports;
}
const {fresh,parse,profileKey,themes,voluntary,growth}=load('features/adaptiveIsland/preferences.ts');
assert.deepEqual(parse(null),fresh());
assert.throws(()=>parse('{"invalid":true}'));
const keys=[null,'guest','a','b','a/b','a%2Fb'].map(profileKey);
assert.equal(new Set(keys).size,6);
const picked={...fresh(),enabled:true,picks:['art','music','space']};
assert.deepEqual(themes(picked),['art','music','space']);
assert.deepEqual(voluntary(picked,'science'),picked);
assert.deepEqual(themes({...picked,enabled:false}),[]);
const auto=voluntary({...picked,automatic:true},'science');
assert.deepEqual(themes(auto),['art','music','space']);
assert.deepEqual(themes({...auto,picks:['art']}),['art','science']);
assert.deepEqual(parse(JSON.stringify(auto)),auto);
assert.deepEqual(parse(JSON.stringify({...auto,automatic:false})).counts,{});
assert.deepEqual(themes({...picked,picks:['space']}),['space']);
assert.deepEqual([1,2,3,5,6,100].map(growth),[1,1,2,2,3,3]);
console.log('PASS privacy defaults, key isolation, manual override, opt-in ranking, disabling, persistence, reset and existing-level growth.');
