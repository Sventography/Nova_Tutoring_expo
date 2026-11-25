// Run after npm ci: node scripts/test-harmony-audio.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../app/_lib/harmonyAudio.ts'),'utf8');
const {outputText,diagnostics}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},reportDiagnostics:true});
assert.equal(diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
const mod={exports:{}};
new Function('module','exports',outputText)(mod,mod.exports);
const {harmonyWave,waveBase64,TONE_SAMPLE_RATE,TONE_SECONDS}=mod.exports;
const keys=Array.from({length:13},(_,i)=>[i]);
for(const root of [0,2,5])for(const third of [3,4])keys.push([root,root+third,root+7]);
const waves=new Set();
for(const notes of keys){
 const bytes=harmonyWave(notes);
 const view=new DataView(bytes.buffer);
 const tag=(i,n)=>String.fromCharCode(...bytes.slice(i,i+n));
 assert.equal(tag(0,4),'RIFF');assert.equal(tag(8,4),'WAVE');assert.equal(tag(36,4),'data');
 assert.equal(view.getUint32(4,true),bytes.length-8);
 assert.equal(view.getUint32(24,true),TONE_SAMPLE_RATE);
 assert.equal(view.getUint16(20,true),1);assert.equal(view.getUint16(22,true),1);
 assert.equal(view.getUint16(34,true),16);
 assert.equal(view.getUint32(40,true),TONE_SAMPLE_RATE*TONE_SECONDS*2);
 assert.equal(view.getInt16(44,true),0);
 assert.equal(view.getInt16(bytes.length-2,true),0);
 let nonzero=false;
 for(let i=44;i<bytes.length;i+=2){
  const sample=view.getInt16(i,true);
  assert.ok(Math.abs(sample)<=5900);
  if(sample!==0)nonzero=true;
 }
 assert.ok(nonzero);
 const encoded=waveBase64(bytes);
 assert.deepEqual(Buffer.from(encoded,'base64'),Buffer.from(bytes));
 assert.equal(waveBase64(harmonyWave(notes)),encoded);
 waves.add(encoded);
}
assert.equal(waves.size,19);
for(const invalid of [[],[0,0],[13],[-1],[1.5],[0,1,2,3],[NaN]])assert.throws(()=>harmonyWave(invalid));
for(let len=0;len<=5;len++){
 const bytes=Uint8Array.from({length:len},(_,i)=>i*47);
 assert.equal(waveBase64(bytes),Buffer.from(bytes).toString('base64'));
}
console.log('Harmony audio waveform checks passed');
