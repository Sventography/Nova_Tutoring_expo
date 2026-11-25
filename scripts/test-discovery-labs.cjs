// Run after npm ci: node scripts/test-discovery-labs.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../app/_lib/discoveryLabs.ts'),'utf8');
const {outputText,diagnostics}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},reportDiagnostics:true});
assert.equal(diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
const mod={exports:{}};
new Function('module','exports',outputText)(mod,mod.exports);
const {squareScale,mountainPalette,SCALE_FACTORS,DEPTH_LEVELS,EDIT_CONTEXTS,editContext}=mod.exports;
for(const n of SCALE_FACTORS)assert.deepEqual(squareScale(n),{length:2*n,area:4*n*n,areaFactor:n*n,volumeFactor:n*n*n});
for(const x of [0,-1,1.5,5,NaN,Infinity])assert.throws(()=>squareScale(x));
for(const x of [0,-1,NaN,Infinity])assert.throws(()=>squareScale(1,x));
const parse=s=>s.match(/\d+/g).map(Number);
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
for(const n of DEPTH_LEVELS){
 const p=mountainPalette(n);
 for(const rgb of Object.values(p))assert.ok(parse(rgb).length===3&&parse(rgb).every(x=>x>=0&&x<=255));
 if(n>0){
  const base=mountainPalette(0);
  assert.ok(distance(parse(p.far),parse(base.far))>distance(parse(p.near),parse(base.near)));
  assert.ok(distance(parse(p.far),[186,205,222])<distance(parse(mountainPalette(n-1).far),[186,205,222]));
 }
}
for(const x of [-1,4,1.5,NaN])assert.throws(()=>mountainPalette(x));
assert.equal(EDIT_CONTEXTS.length,3);
assert.equal(new Set(EDIT_CONTEXTS.map(x=>x.id)).size,3);
for(const context of EDIT_CONTEXTS){
 assert.deepEqual(editContext(context.id),context);
 assert.ok(context.label && context.interpretation && context.explanation);
}
for(const invalid of ['','unknown','__proto__','constructor'])assert.equal(editContext(invalid),undefined);
console.log('Discovery lab model checks passed');
