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
const {squareScale,mountainPalette,SCALE_FACTORS,DEPTH_LEVELS,EDIT_CONTEXTS,editContext,COIN_BATCHES,simulateCoins,PIXEL_RESOLUTIONS,PIXEL_SHAPES,PIXEL_COLORS,pixelMask}=mod.exports;
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
for(const n of COIN_BATCHES){
 assert.deepEqual(simulateCoins(n,()=>0),{heads:n,tails:0});
 assert.deepEqual(simulateCoins(n,()=>0.5),{heads:0,tails:n});
 let draws=0;assert.deepEqual(simulateCoins(n,()=>draws++%2?0.9:0.1),{heads:n/2,tails:n/2});assert.equal(draws,n);
 for(let trial=0;trial<10;trial++){const r=simulateCoins(n);assert.equal(r.heads+r.tails,n);assert.ok(Number.isInteger(r.heads)&&r.heads>=0&&r.tails>=0);}
}
for(const n of [0,1,1.5,1000,NaN,Infinity])assert.throws(()=>simulateCoins(n));
for(const sample of [-0.1,1,NaN,Infinity])assert.throws(()=>simulateCoins(10,()=>sample));
assert.equal(new Set(PIXEL_COLORS.map(c=>c.value)).size,PIXEL_COLORS.length);
for(const n of PIXEL_RESOLUTIONS)for(const shape of PIXEL_SHAPES){
 const mask=pixelMask(n,shape);
 assert.equal(mask.length,n*n);
 assert.ok(mask.every(v=>typeof v==='boolean'));
 assert.ok(mask.some(Boolean)&&mask.some(v=>!v));
 assert.deepEqual(mask,pixelMask(n,shape));
 for(let y=0;y<n;y++)for(let x=0;x<n;x++)assert.equal(mask[y*n+x],mask[y*n+n-1-x]);
}
for(const n of [0,1,7,64,NaN,Infinity])assert.throws(()=>pixelMask(n,'circle'));
assert.throws(()=>pixelMask(8,'unknown'));
console.log('Discovery lab model checks passed');
