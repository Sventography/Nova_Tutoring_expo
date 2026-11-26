// Run after npm ci: node scripts/test-orbit-lab.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../app/_lib/orbitLab.ts'),'utf8');
const {outputText,diagnostics}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},reportDiagnostics:true});
assert.equal(diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
const mod={exports:{}};new Function('module','exports',outputText)(mod,mod.exports);
const {ORBIT_RADII,ORBIT_STEPS,orbitAt}=mod.exports;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,a+' != '+b);
assert.deepEqual(ORBIT_RADII,[.5,1,1.5,2]);
assert.equal(ORBIT_STEPS,12);
for(const radius of ORBIT_RADII) {
  let previous=-1;
  for(let step=0;step<=ORBIT_STEPS;step++) {
    const o=orbitAt(radius,step);
    close(o.period*o.period,radius**3);
    close(Math.hypot(o.x,o.y),radius);
    close(o.elapsed,step/12);
    close(o.turns*o.period,o.elapsed);
    close(o.speed*o.speed*radius,1);
    close(o.inwardX*o.x+o.inwardY*o.y,-radius);
    close(o.tangentX*o.x+o.tangentY*o.y,0);
    close(o.inwardX*o.tangentX+o.inwardY*o.tangentY,0);
    close(Math.hypot(o.inwardX,o.inwardY),1);
    close(Math.hypot(o.tangentX,o.tangentY),1);
    assert.ok(o.turns>previous);previous=o.turns;
  }
}
close(orbitAt(1,12).turns,1);close(orbitAt(1,12).x,1);close(orbitAt(1,12).y,0);
assert.ok(orbitAt(.5,12).turns>1);assert.ok(orbitAt(2,12).turns<1);
for(const r of [0,-1,3,.75,NaN,Infinity,'1',null,undefined])assert.throws(()=>orbitAt(r,0));
for(const n of [-1,13,.5,NaN,Infinity,'1',null,undefined])assert.throws(()=>orbitAt(1,n));
const ui=fs.readFileSync(path.join(__dirname,'../app/components/OrbitLab.tsx'),'utf8');
const dispatch=fs.readFileSync(path.join(__dirname,'../app/components/DiscoveryLabs.tsx'),'utf8');
assert.ok(dispatch.includes('if(discoveryId==="space-orbit")return <OrbitLab/>;'));
assert.ok(ui.includes('accessibilityLiveRegion="polite"'));
assert.ok(ui.includes('directions only'));
assert.ok(ui.includes('not drawn to scale'));
assert.ok(!/setInterval|setTimeout|fetch\(|AsyncStorage|addCoins|addXP/.test(ui));
console.log('Orbit lab model and source checks passed');
