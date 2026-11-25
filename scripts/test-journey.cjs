// Run with node scripts/test-journey.cjs after npm ci.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name).exports;
  const source = fs.readFileSync(path.join(__dirname,'../app/_lib',name+'.ts'),'utf8');
  const {outputText, diagnostics} = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},reportDiagnostics:true});
  assert.equal(diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
  const mod={exports:{}}; cache.set(name,mod);
  new Function('module','exports','require',outputText)(mod,mod.exports,(request)=>load(request.replace(/^\.\//,'')));
  return mod.exports;
}
const {DISCOVERIES,INTERESTS,dailyDiscovery}=load('discoveryModel');
const {ADVENTURES}=load('adventureModel');
const {emptyJourney,journeyKey,normalizeJourney,toggleSaved,markCompleted,relatedDiscoveries,dailyDetour}=load('journeyModel');
const empty=emptyJourney();
assert.deepEqual(normalizeJourney(null),empty);
assert.deepEqual(normalizeJourney({saved:['film-cut','film-cut','unknown',42],completed:['silent-film','silent-film','bad']}),{saved:['film-cut'],completed:['silent-film']});
assert.deepEqual(normalizeJourney({saved:'film-cut',completed:{}}),empty);
assert.notEqual(journeyKey(null),journeyKey('guest'));
assert.notEqual(journeyKey('a'),journeyKey('b'));
assert.notEqual(journeyKey('a/b'),journeyKey('a%2Fb'));
assert.equal(toggleSaved(empty,'unknown'),empty);
assert.deepEqual(toggleSaved(toggleSaved(empty,'film-cut'),'film-cut'),empty);
assert.deepEqual(empty,emptyJourney());
const done=markCompleted(empty,'silent-film');
assert.equal(markCompleted(done,'silent-film'),done);
assert.equal(markCompleted(done,'unknown'),done);
assert.deepEqual(markCompleted(done,'moon-outpost').completed,['silent-film','moon-outpost']);
for(const d of DISCOVERIES){
 const related=relatedDiscoveries(d.id);
 assert.ok(related.length>=2 && related.length<=3);
 assert.equal(new Set(related.map(x=>x.id)).size,related.length);
 assert.ok(related.every(x=>x.id!==d.id && DISCOVERIES.some(c=>c.id===x.id)));
 assert.ok(related.some(x=>x.interest!==d.interest));
}
assert.deepEqual(relatedDiscoveries('unknown'),[]);
assert.equal(normalizeJourney({completed:ADVENTURES.map(a=>a.id)}).completed.length,ADVENTURES.length);
// Every possible selected-interest subset, including none and all.
const subjects=INTERESTS.map(([id])=>id);
for(let mask=0;mask<(1<<subjects.length);mask++){
 const preferred=subjects.filter((_,i)=>mask&(1<<i));
 const expected=new Set(DISCOVERIES.filter(d=>preferred.includes(d.interest)).flatMap(d=>relatedDiscoveries(d.id)).filter(d=>!preferred.includes(d.interest)).map(d=>d.id));
 const seen=new Set();
 for(let day=-2;day<Math.max(2,expected.size);day++){
  const before=dailyDiscovery(preferred,day);
  const detour=dailyDetour(preferred,day);
  assert.equal(Boolean(detour),Boolean(expected.size));
  assert.equal(dailyDiscovery(preferred,day).id,before.id);
  if(!detour)continue;
  assert.ok(expected.has(detour.discovery.id));
  assert.ok(preferred.includes(detour.connectedFrom.interest));
  assert.ok(!preferred.includes(detour.discovery.interest));
  assert.ok(relatedDiscoveries(detour.connectedFrom.id).some(d=>d.id===detour.discovery.id));
  assert.equal(dailyDetour([...preferred].reverse(),day).discovery.id,detour.discovery.id);
  assert.deepEqual(dailyDetour(preferred,day),detour);
  if(day>=0)seen.add(detour.discovery.id);
 }
 assert.deepEqual(seen,expected);
}
for(const day of [NaN,Infinity,-Infinity,1.5])assert.equal(dailyDetour(['music'],day),undefined);
assert.equal(dailyDetour(['unknown'],0),undefined);
console.log('Journey model checks passed');
