import React,{useEffect,useLayoutEffect,useMemo,useRef} from "react";
import {Group,InstancedMesh,Color,Object3D,SphereGeometry,CapsuleGeometry} from "three";
import { useFrame,useThree } from "../../components/islandFiber";
import ChibiHead from "../../components/island3d/ChibiHead";
import {mergePaintedParts,type PaintedPart} from "../../components/island3d/chibiGeometry";
import type { Interest } from "../../app/_lib/discoveryModel";
import { districts,stageAt } from "./districts";

type Vec=[number,number,number];
type Shape="box"|"ball"|"ring"|"cone"|"drum";
type Part=[Shape,Vec,Vec,string?,number?];
// Local units for the small exhibit models. All four stages share one reserved plot.
const seed:Record<Interest,Part[]>={
 music:[["ball",[0,.46,0],[.46,.53,.15]],["box",[.21,.85,0],[.13,.8,.1],"#7d513a",-.45],["box",[0,.32,.45],[1,.12,.3]]],
 art:[["box",[0,.59,0],[.1,1.2,.1],"#815538",.14],["box",[0,.88,.09],[.92,.72,.1],"#ffe3b5"],["ball",[-.15,.97,.17],[.28,.25,.05]],["drum",[.52,.03,.42],[.46,.04,.35],"#67b1cd"]],
 film:[["box",[0,.24,0],[.14,.48,.16],"#786555"],["box",[0,.58,0],[.86,.52,.18],"#424351"],["box",[-.04,.94,0],[.9,.14,.18],"#eee6da",.22],["ball",[.57,1.06,0],[.26,.26,.15]],["box",[.6,.65,0],[.13,.62,.12]]],
 space:[["box",[0,.38,0],[.16,.74,.16]],["drum",[.04,.82,0],[.32,1.05,.32],"#9db4ff",-.82],["box",[-.57,.44,0],[.035,.86,.035],"#8e846c"],["ball",[-.57,.88,0],[.2,.2,.2],"#f6d575"]],
 astrology:[["drum",[0,.2,0],[1.05,.22,1.05]],["cone",[0,.52,0],[.25,.65,.24],"#e2bb7d",-.3],["ring",[.6,.84,0],[.28,.28,.28]]],
 science:[["box",[0,.29,0],[1,.45,.6]],["cone",[0,.69,0],[1,.52,.7],"#b2dec0"],["ball",[.65,.36,0],[.24,.38,.24],"#538c5d"]],
 math:[["box",[0,.16,0],[.46,.25,.46],"#e9c764",.0],["cone",[.5,.31,0],[.47,.6,.47]],["ball",[-.53,.28,0],[.41,.41,.41]]],
 history:[["box",[0,.54,0],[1,.1,.57],"#945d3c"],["box",[0,.32,0],[.14,.57,.18]],["box",[.1,.62,0],[.63,.04,.42],"#ffedbe"],["drum",[-.47,.77,0],[.19,.43,.19]]],
 technology:[["box",[0,.4,0],[.54,.57,.36]],["box",[0,.84,0],[.61,.33,.4],"#8fb2c2"],["ball",[-.15,.86,.21],[.1,.1,.07],"#25364b"],["ball",[.15,.86,.21],[.1,.1,.07],"#25364b"]],
 writing:[["box",[0,.39,0],[1.0,.10,.62],"#967352"],["box",[0,.20,0],[.20,.4,.20],"#89684b"],["box",[-.22,.48,0],[.46,.1,.55],"#ead8a6",-.14],["box",[.22,.48,0],[.46,.1,.55],"#fff0c5",.14],["box",[-.55,.5,-.4],[.14,1,.14],"#906e4f"],["ball",[-.55,1.1,-.4],[.75,.67,.75],"#629c78"]]
};
const marks: Record<Interest,[Shape,Shape,Shape]>={music:["cone","drum","ring"],art:["ball","box","cone"],film:["box","box","ring"],space:["ball","ring","ball"],astrology:["ring","box","ring"],science:["ring","cone","ball"],math:["drum","cone","box"],history:["box","drum","cone"],technology:["box","ring","drum"],writing:["ball","box","cone"]};
// Distinct silhouettes across the three additions. Coordinates are local to each building.
const trim:Record<Interest,[Part[],Part[],Part[]]>={
 music:[ [ ["box",[0,.52,.35],[.74,.08,.25],"#f8dfa8"] ], [ ["drum",[0,.14,.5],[1.25,.16,.66],"#aa7f62"],["drum",[0,.24,.35],[1.02,.14,.56]] ], [ ["box",[-.44,.74,.15],[.1,1.43,.1]],["box",[.44,.74,.15],[.1,1.43,.1]],["cone",[0,1.5,.14],[1.2,.44,.75]] ] ],
 art:[ [ ["ball",[0,.66,.33],[.28,.44,.22],"#bd795c"] ], [ ["box",[0,.7,.32],[.67,.46,.05],"#e3ad58"],["box",[0,.69,.36],[.36,.13,.035],"#61a496",.3] ], [ ["box",[0,1.05,.38],[.88,.55,.06],"#e3bd83"],["ring",[0,1.04,.43],[.35,.35,.1]] ] ],
 film:[ [ ["box",[.32,.85,.3],[.08,.65,.08]],["cone",[.32,1.15,.28],[.35,.21,.3],"#ffe7a2"] ], [ ["box",[0,.95,.34],[1.05,.58,.09],"#ecdfc5"] ], [ ["box",[0,1.35,.35],[1.1,.15,.27],"#ac635e"],["box",[0,.66,.42],[.45,.86,.06],"#443950"] ] ],
 space:[ [ ["ball",[.38,.79,.3],[.31,.31,.31],"#c4bfba"] ], [ ["ring",[0,.95,.33],[.9,.54,.24],"#eed690"],["ball",[.38,.94,.33],[.18,.18,.18]] ], [ ["ball",[0,1.43,.08],[1.14,.9,1.05]],["box",[0,1.63,.53],[.12,.36,.05],"#434766"] ] ],
 astrology:[ [ ["ball",[-.27,.56,.32],[.28,.28,.13]],["ball",[.27,.56,.32],[.23,.23,.1],"#f1d287"] ], [ ["box",[0,.7,.32],[.8,.5,.1],"#7c688e"],["ring",[0,.72,.4],[.4,.4,.08]] ], [ ["ring",[0,1.27,.39],[.88,.88,.1],"#dfbf80"] ] ],
 science:[ [ ["ring",[0,.55,.35],[.83,.83,.16],"#a8855a"],["box",[0,.55,.37],[.64,.08,.08]] ], [ ["cone",[0,.8,.4],[.32,.55,.3],"#aadacc"] ], [ ["ball",[0,.83,.45],[.58,.77,.38],"#88b685"] ] ],
 math:[ [ ["drum",[0,.38,.35],[.78,.13,.66],"#80c9d1"] ], [ ["box",[-.16,.74,.38],[.09,.68,.09],undefined,-.52],["box",[.16,.74,.38],[.09,.68,.09],undefined,.52] ], [ ["ring",[0,1.44,.26],[.8,.8,.2]] ] ],
 history:[ [ ["box",[0,.66,.36],[.82,.16,.4],"#c68c64"] ], [ ["drum",[0,.68,.38],[.41,.28,.3],"#917053"] ], [ ["box",[-.34,.68,.36],[.11,1,.12],"#e6d4b3"],["box",[.34,.68,.36],[.11,1,.12],"#e6d4b3"] ] ],
 technology:[ [ ["box",[-.16,.56,.28],[.26,.22,.13],"#92c6b3"],["box",[.16,.6,.28],[.26,.22,.13],"#57828b"] ], [ ["box",[-.18,.77,.33],[.13,.48,.13],undefined,-.6],["ball",[0,.94,.33],[.23,.23,.23]] ], [ ["box",[0,1,.38],[.71,.46,.07],"#42576c"],["box",[0,.99,.43],[.42,.12,.04],"#93d6bd"] ] ],
 writing:[ [ ["box",[0,.47,.32],[.68,.12,.35],"#ad8f68"] ], [ ["box",[-.36,.67,.35],[.18,.74,.1],"#ae666e"],["box",[.36,.67,.35],[.18,.74,.1],"#ae666e"] ], [ ["box",[-.21,1.24,.38],[.42,.1,.47],"#f0dfbb",-.18],["box",[.21,1.24,.38],[.42,.1,.47],"#f0dfbb",.18] ] ]
};
function Geometry({shape}:{shape:Shape}){
 return shape==="box"?<boxGeometry/>:shape==="ring"?<torusGeometry args={[.36,.075,6,14]}/>:shape==="ball"?<sphereGeometry args={[.5,10,7]}/>:shape==="cone"?<coneGeometry args={[.5,1,6]}/>:<cylinderGeometry args={[.5,.5,1,12]}/>;
}
function Model({part,tint}:{part:Part;tint:string}){
 const [shape,pos,size,color,roll=0]=part;
 return <mesh position={pos} scale={size} rotation={[0,0,roll]}><Geometry shape={shape}/>
  <meshStandardMaterial color={color||tint} roughness={.88} emissive={color||tint} emissiveIntensity={.08}/>
 </mesh>;
}
function Instances({parts,shape,tint}:{parts:Part[];shape:Shape;tint:string}){
 const ref=useRef<InstancedMesh>(null);
 useLayoutEffect(()=>{
  const mesh=ref.current;if(!mesh)return;
  const transform=new Object3D(),color=new Color();
  parts.forEach(([,pos,size,paint,roll=0],i)=>{
   transform.position.set(...pos);transform.scale.set(...size);transform.rotation.set(0,0,roll);
   transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);mesh.setColorAt(i,color.set(paint||tint));
  });
  mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  mesh.computeBoundingSphere();
 },[parts,tint]);
 return <instancedMesh ref={ref} args={[undefined,undefined,parts.length]}><Geometry shape={shape}/><meshStandardMaterial roughness={.88}/></instancedMesh>;
}
function ModelSet({parts,tint}:{parts:Part[];tint:string}){
 const groups=useMemo(()=>{const by=new Map<Shape,Part[]>();for(const p of parts){const group=by.get(p[0]);if(group)group.push(p);else by.set(p[0],[p]);}return [...by];},[parts]);
 return <>{groups.map(([shape,models])=><Instances key={shape} shape={shape} parts={models} tint={tint}/>)}</>;
}
function Porch({width,tall}:{width:number;tall:number}){
 return <group>
  <Model tint="#73513e" part={["box",[0,tall*.36,width*.48],[width*.29,tall*.72,.06]]}/>
  <Model tint="#ffd188" part={["box",[-width*.29,tall*.57,width*.48],[width*.17,tall*.23,.065]]}/>
  <Model tint="#dcb898" part={["box",[0,.055,width*.58],[width*.51,.1,.22]]}/>
 </group>;
}
function Resident({id,arm}:{id:Interest;arm:React.RefObject<Group|null>}){
 const observing=id==="space"||id==="film";
 const painting=id==="art"||id==="writing";
 const y=observing?.69:.5;
 const skin="#c98f65",coat=districts[id].color;
 const body=useMemo(()=>{
  const ball=(color:string,position:Vec,scale:Vec):PaintedPart=>({
   geometry:new SphereGeometry(1,14,10),color,position,scale
  });
  const parts:PaintedPart[]=[
   ball(coat,[0,.43,0],[.17,.146,.125]),
   ball(skin,[0,.54,0],[.062,.065,.06]),
   ball("#f5e7c8",[-.044,.538,.102],[.045,.027,.022]),
   ball("#f5e7c8",[.044,.538,.102],[.045,.027,.022]),
   ball("#f5e7c8",[0,.435,.125],[.012,.012,.009]),
   ball(coat,[.14,.47,.084],[.06,.068,.109]),
   ball(skin,[.14,.47,.188],[.052,.055,.055]),
  ];
  for(const x of [-.09,.09])parts.push(
   {geometry:new CapsuleGeometry(.058,.13,5,10),color:"#566372",position:[x,.23,0]},
   ball("#53433e",[x,.095,.035],[.08,.064,.125]),
   ball("#a48c76",[x,.051,.035],[.077,.017,.121])
  );
  return mergePaintedParts(parts);
 },[skin,coat]);
 const armGeometry=useMemo(()=>mergePaintedParts([
  {geometry:new SphereGeometry(1,14,10),color:coat,
   position:[0,(y-.52)*.45,.091],scale:[.055,.06,.123]},
  {geometry:new SphereGeometry(1,14,10),color:skin,
   position:[0,y-.52,.21],scale:[.052,.055,.06]},
 ]),[skin,coat,y]);
 useEffect(()=>()=>{body.dispose();armGeometry.dispose();},[body,armGeometry]);
 return <group position={[-.32,0,.30]} rotation={[0,1.95,0]}>
  <mesh geometry={body}><meshStandardMaterial vertexColors roughness={.72}/></mesh>
  <group position={[0,.66,observing?.06:0]} scale={.52}>
   <ChibiHead skin={skin} hair="#55413e" iris="#6b4d33" hairStyle="crop"/>
  </group>
  <group ref={arm} position={[-.14,.52,.025]}>
   <mesh geometry={armGeometry}><meshStandardMaterial vertexColors roughness={.72}/></mesh>
   {painting && <Model tint="#855942" part={["box",[0,y-.49,.26],[.026,.15,.027],undefined,-.3]}/>}
  </group>
 </group>;
}
function Landscape({id}:{id:Interest}){
 const tint=districts[id].color;
 const parts=useMemo<Part[]>(()=>[
  ["drum",[0,-.20,0],[3.45,.43,3.45],"#8e7866"],["drum",[0,.01,0],[3.54,.055,3.54],"#a1b783"],
  ["drum",[0,.04,.04],[1.52,.012,.97],"#829671"],["box",[0,.055,.42],[3.4,.028,.35],"#dfc9a3"],
  ["box",[.47,.061,-.10],[.31,.025,1],"#dfc9a3"],["drum",[-1.14,.37,-.32],[.16,.68,.16],"#937756"],
  ["ball",[-1.24,.86,-.32],[.73,.86,.63],"#759376"],["ball",[-.98,.96,-.27],[.49,.56,.46],"#9cb582"],
  ...[-.29,0,.29].flatMap((x,i):Part[]=>[["ball",[x+.6,.15,.92],[.3,.18,.23],"#79916d"],["ball",[x+.645,.24,.96],[.095,.1,.1],i===1?"#f4d78e":tint]])
 ],[tint]);
 return <ModelSet parts={parts} tint={tint}/>;
}
function District({id,stage,activity,celebrate}:{id:Interest;stage:number;activity:boolean;celebrate:boolean}){
 const arm=useRef<Group>(null),building=useRef<Group>(null),wheel=useRef<Group>(null);
 // If levels change again during a celebration, finish the departing tier.
 useLayoutEffect(()=>{const added=building.current;return ()=>{if(added)added.scale.y=1;};},[stage]);
 const elapsed=useRef(0);const invalidate=useThree(s=>s.invalidate);
 useEffect(()=>{elapsed.current=0;invalidate();},[activity,celebrate,stage,invalidate]);
 useFrame((_,delta)=>{
   elapsed.current=Math.min(3,elapsed.current+Math.min(delta,.08));
   const t=elapsed.current;
   if(arm.current){
     const stroke=activity&&t<3?Math.sin(t*(id==="music"?9:id==="art"?3:2)):0;
     arm.current.rotation.x=(id==="space"||id==="film"?-.45:0)+stroke*(id==="music"?.22:id==="art"?.32:.10);
   }
   if(wheel.current)wheel.current.rotation.z=id==="science"&&activity&&t<3?Math.sin(t*2)*.25:0;
   if(building.current)building.current.scale.y=celebrate?Math.min(1,.2+t):1;
   if((activity||celebrate)&&t<3)invalidate();
 });
 const tint=districts[id].color, styles=marks[id];
 return <group>
  <Landscape id={id}/>
  <ModelSet parts={seed[id]} tint={tint}/>
  <Resident id={id} arm={arm}/>
  {stage>=2 && <group key={"tier-2"} ref={stage===2?building:undefined} position={[.85,0,-.52]}><Model tint="#907356" part={["box",[0,.27,0],[.75,.48,.5]]}/><group ref={wheel}><Model tint={tint} part={[styles[0],[0,.72,0],[.86,.62,.7]]}/></group><Porch width={0.65} tall={0.48}/>{trim[id][0].map((part,k)=><Model key={k} part={part} tint={tint}/>)}</group>}
  {stage>=3 && <group key={"tier-3"} ref={stage===3?building:undefined} position={[-.76,0,-.73]}><Model tint="#c0ab95" part={["box",[0,.42,0],[.85,.8,.56]]}/><Model tint={tint} part={[styles[1],[0,1.02,0],[1,.63,.76]]}/><Porch width={0.74} tall={0.84}/>{trim[id][1].map((part,k)=><Model key={k} part={part} tint={tint}/>)}</group>}
  {stage>=4 && <group key={"tier-4"} ref={stage===4?building:undefined} position={[0,0,-1.05]}><Model tint="#e1cfad" part={["drum",[0,.8,0],[.66,1.58,.64]]}/><Model tint={tint} part={[styles[2],[0,1.75,0],[.88,.72,.85]]}/><Porch width={0.66} tall={1.05}/>{trim[id][2].map((part,k)=><Model key={k} part={part} tint={tint}/>)}</group>}
 </group>;
}
export default function DistrictShore({ids,level,activity=false,celebrate=false,onExplore}:{ids:Interest[];level:number;activity?:boolean;celebrate?:boolean;onExplore?:(id:Interest)=>void}){
 return <group>{ids.map((id,i)=><group key={id} position={[(i-1)*4,0,0]} onClick={e=>{if(onExplore && e.delta<=5){e.stopPropagation();onExplore(id);}}}><District id={id} stage={stageAt(level)} activity={activity} celebrate={celebrate}/></group>)}
 {ids.slice(1).map((id,i)=><Model key={id} tint="#b19873" part={["box",[(i-.5)*4,.014,.42],[1.14,.11,.38]]}/>)}</group>;
}
