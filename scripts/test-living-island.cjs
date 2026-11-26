const assert=require('node:assert/strict');
const ts=require('typescript'),fs=require('node:fs'),path=require('node:path'),three=require('three');
function load(file){
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const mod={exports:{}};new Function('module','exports','require',js)(mod,mod.exports,id=>id==='three'?three:load(path.resolve(path.dirname(file),id+'.ts')));return mod.exports;
}
const root='features/adaptiveIsland/';
const {districts,stageAt}=load(root+'districts.ts'),{plan,footprint,overlap}=load(root+'placement.ts');
const {applyMoves,restore}=load(root+'layoutJournal.ts'),{measurePlacement,measuredItem}=load(root+'measure.ts');
const {DISCOVERIES}=load('app/_lib/discoveryModel.ts');
const {ADVENTURES}=load('app/_lib/adventureModel.ts');
const box=(x,z,w,d,angle=0)=>({x,z,w,d,angle});
const land=[{surface:'grass',bounds:box(0,0,100,100)}];
const plots=[box(-4,0,3.8,4),box(0,0,3.8,4),box(4,0,3.8,4)];
const item=(id,x,z)=>({id,provider:'decor',x,z,angle:.6,scale:1,parts:[box(.1,.15,1,.7)],movable:true,surface:'grass'});
async function test(){
 let permutations=0;
 for(const [id,d] of Object.entries(districts)){
  assert.equal(d.exhibits.length,4);assert.deepEqual(d.lessons.map(n=>DISCOVERIES.find(v=>v.id===n)?.interest),d.lessons.map(()=>id));
  if(d.adventure)assert.ok(ADVENTURES.some(a=>a.id===d.adventure&&a.interest===id));
 }
 for(const a of Object.keys(districts))for(const b of Object.keys(districts))for(const c of Object.keys(districts)){
  if(new Set([a,b,c]).size!==3)continue;
  for(const [i,l] of [1,3,6,10].entries()){
   assert.equal(stageAt(l),i+1);assert.ok([a,b,c].every(id=>districts[id].exhibits[i]));
   assert.deepEqual(plan([],[],plots,land),[]);permutations++;
  }
 }
 assert.equal(permutations,2880);
 assert.deepEqual(plan([],[],[],land),[]);
 const dense=Array.from({length:160},(_,i)=>item(String(i),-32+i%20*3,9+Math.floor(i/20)*3));
 const colliding=item('move',0,0);colliding.scale=4;colliding.angle=1.23;
 const fixed=item('castle',-10,0);fixed.movable=false;
 const other={...item('move',4,0),provider:'builder'};
 const items=[fixed,...dense,colliding,other], original=structuredClone(items);
 const moves=plan(items,[box(0,-10,15,2,.4)],plots,land);
 assert.equal(moves.length,2);assert.deepEqual(moves,plan(items,[box(0,-10,15,2,.4)],plots,land));
 assert.deepEqual(items,original);
 const blocked=plan([fixed],[],[box(-10,0,4,4)],land);assert.equal(blocked,null);
 assert.equal(plan([colliding],[],[box(0,0,4,4)],[{surface:'grass',bounds:box(0,0,4,4)}]),null);
 assert.equal(plan([],[],[box(50,0,2,2,.6)],land),null);
 assert.equal(plan([],[],[plots[0],plots[0]],land),null);
 assert.equal(plan([colliding,colliding],[],plots,land),null);
 const shape=new three.Group();const mesh=new three.Mesh(new three.BoxGeometry(4,.4,.5));mesh.position.x=1.5;shape.add(mesh);
 const measured=measurePlacement(shape,.1);
 assert.ok(Math.abs(measured[0].w-4.2)<1e-6);
 const transformed=footprint({...item('offset',0,0),parts:measured,scale:2,angle:Math.PI/2})[0];
 assert.ok(Math.abs(transformed.z+3)<1e-8);assert.ok(overlap(transformed,box(0,-6,.5,.5)));assert.equal(overlap(transformed,box(5,0,.5,.5)),false);
 // Compare against the actual Three world matrix, including a transformed child group.
 const nested=new three.Group();shape.remove(mesh);shape.add(nested);nested.add(mesh);
 nested.rotation.set(.13,.47,-.21);nested.position.set(.8,.4,-.6);nested.scale.set(.8,1.3,1.5);
 for(const yaw of [-Math.PI/2,Math.PI/4,Math.PI/2,-.362])for(const scale of [.5,1,4]){
   shape.position.set(3,0,-7);shape.rotation.y=yaw;shape.scale.setScalar(scale);shape.updateMatrixWorld(true);
   const parts=measurePlacement(shape);
   const [bounds]=footprint({...item('nested',3,-7),angle:yaw,scale,parts});
   const pos=mesh.geometry.attributes.position;
   for(let i=0;i<pos.count;i++){
    const vertex=new three.Vector3().fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);
    assert.ok(overlap(bounds,box(vertex.x,vertex.z,.00001,.00001)));
   }
   const center=new three.Vector3().setFromMatrixPosition(mesh.matrixWorld);
   assert.ok(Math.hypot(bounds.x-center.x,bounds.z-center.z)<1e-6);
 }
 const world=new three.Group();world.rotation.y=-.08;world.position.x=-3;world.add(shape);
 for(const provider of ['builder','decor']){
   const placed=measuredItem(shape,{id:'original',provider,surface:'grass',movable:true});
   const [bounds]=footprint(placed);
   const center=new three.Vector3().setFromMatrixPosition(mesh.matrixWorld);
   assert.ok(Math.hypot(bounds.x-center.x,bounds.z-center.z)<1e-6);
 }
 const inst=new three.InstancedMesh(new three.BoxGeometry(1,1,2),new three.MeshBasicMaterial(),2);
 inst.setMatrixAt(0,new three.Matrix4().makeTranslation(-2,0,0));
 inst.setMatrixAt(1,new three.Matrix4().makeTranslation(3,0,1));
 assert.deepEqual(measurePlacement(inst).map(p=>[p.x,p.z]),[[-2,0],[3,1]]);
 shape.rotation.x=.35;assert.equal(measuredItem(shape,{id:'tilt',provider:'decor',surface:'grass',movable:true}),null);
 const records=new Map([['A',{items,revision:1,prior:null}],['B',{items:[],revision:7,prior:null}]]);
 let fail=true;
 const store={read:async owner=>structuredClone(records.get(owner)),swap:async(o,r,n)=>{
   if(fail)throw Error('interrupted');if(records.get(o)?.revision!==r)return false;records.set(o,n);return true;}};
 const valid=ls=>ls.every(it=>footprint(it).every(p=>plots.every(q=>!overlap(p,q))));
 await assert.rejects(applyMoves(store,'A',1,moves,valid));assert.deepEqual(records.get('A').items,original);
 fail=false;const [first,second]=await Promise.all([applyMoves(store,'A',1,moves,valid),applyMoves(store,'A',1,moves,valid)]);
 assert.equal(Number(first)+Number(second),1);assert.deepEqual(records.get('B').items,[]);
 assert.deepEqual(records.get('A').items.slice(0,161),original.slice(0,161));
 for(const [i,it] of records.get('A').items.entries()){const {x,z,...rest}=it;const {x:oldX,z:oldZ,...old}=original[i];assert.deepEqual(rest,old);}
 assert.equal(await restore(store,'A',1,()=>true),false);assert.equal(await restore(store,'A',2,valid),false);
 assert.equal(await restore(store,'A',2,()=>true),true);assert.deepEqual(records.get('A').items,original);
 console.log('PASS 720 ordered trios × four stages, catalog targets, compound footprints, 160 unchanged decorations, both provider IDs, blocked expansion, save failure, stale revision, isolation and undo.');
}
test().catch(e=>{console.error(e);process.exitCode=1;});
