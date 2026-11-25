import React,{useEffect,useRef} from "react";
import type { Group } from "three";
import { useFrame,useThree } from "../../components/islandFiber";
import type { Interest } from "../../app/_lib/discoveryModel";
import { districts,stageAt } from "./districts";

type Vec=[number,number,number];
type Shape="box"|"ball"|"ring"|"cone"|"drum";
type Part=[Shape,Vec,Vec,string?,number?];
// Local units for the small exhibit models. All four stages share one reserved plot.
const seed:Record<Interest,Part[]>={
 music:[["ball",[0,.46,0],[.46,.53,.15]],["box",[.21,.85,0],[.13,.8,.1],"#7d513a",-.45],["box",[0,.32,.45],[1,.12,.3]]],
 art:[["box",[0,.59,0],[.1,1.2,.1],"#815538",.14],["box",[0,.88,.09],[.92,.72,.1],"#ffe3b5"],["ball",[-.15,.97,.17],[.28,.25,.05]],["drum",[.52,.03,.42],[.46,.04,.35],"#67b1cd"]],
 film:[["box",[0,.58,0],[.86,.52,.18],"#424351"],["box",[-.04,.94,0],[.9,.14,.18],"#eee6da",.22],["ball",[.57,1.06,0],[.26,.26,.15]],["box",[.6,.65,0],[.13,.62,.12]]],
 space:[["box",[0,.38,0],[.16,.74,.16]],["drum",[.04,.82,0],[.32,1.05,.32],"#9db4ff",-.82],["ball",[-.57,.88,0],[.2,.2,.2],"#f6d575"]],
 astrology:[["drum",[0,.2,0],[1.05,.22,1.05]],["cone",[0,.52,0],[.25,.65,.24],"#e2bb7d",-.3],["ring",[.6,.84,0],[.28,.28,.28]]],
 science:[["box",[0,.29,0],[1,.45,.6]],["cone",[0,.69,0],[1,.52,.7],"#b2dec0"],["ball",[.65,.36,0],[.24,.38,.24],"#538c5d"]],
 math:[["box",[0,.16,0],[.46,.25,.46],"#e9c764",.0],["cone",[.5,.31,0],[.47,.6,.47]],["ball",[-.53,.28,0],[.41,.41,.41]]],
 history:[["box",[0,.54,0],[1,.1,.57],"#945d3c"],["box",[0,.32,0],[.14,.57,.18]],["box",[.1,.62,0],[.63,.04,.42],"#ffedbe"],["drum",[-.47,.77,0],[.19,.43,.19]]],
 technology:[["box",[0,.4,0],[.54,.57,.36]],["box",[0,.84,0],[.61,.33,.4],"#8fb2c2"],["ball",[-.15,.86,.21],[.1,.1,.07],"#25364b"],["ball",[.15,.86,.21],[.1,.1,.07],"#25364b"]],
 writing:[["box",[-.22,.48,0],[.46,.1,.55],"#ead8a6",-.14],["box",[.22,.48,0],[.46,.1,.55],"#fff0c5",.14],["box",[-.55,.5,-.4],[.14,1,.14],"#906e4f"],["ball",[-.55,1.1,-.4],[.75,.67,.75],"#629c78"]]
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
function Model({part,tint}:{part:Part;tint:string}){
 const [shape,pos,size,color,roll=0]=part;
 return <mesh position={pos} scale={size} rotation={[0,0,roll]}>
  {shape==="box"?<boxGeometry/>:shape==="ring"?<torusGeometry args={[.36,.075,6,14]}/>:shape==="ball"?<sphereGeometry args={[.5,10,7]}/>:shape==="cone"?<coneGeometry args={[.5,1,6]}/>:<cylinderGeometry args={[.5,.5,1,12]}/>}
  <meshStandardMaterial color={color||tint}/>
 </mesh>;
}
function District({id,stage,activity,celebrate}:{id:Interest;stage:number;activity:boolean;celebrate:boolean}){
 const arm=useRef<Group>(null),building=useRef<Group>(null),wheel=useRef<Group>(null);
 const elapsed=useRef(0);const invalidate=useThree(s=>s.invalidate);
 useEffect(()=>{elapsed.current=0;invalidate();},[activity,celebrate,stage,invalidate]);
 useFrame((_,delta)=>{
   elapsed.current=Math.min(3,elapsed.current+Math.min(delta,.08));
   const t=elapsed.current;
   if(arm.current)arm.current.rotation.z=activity&&t<3?Math.sin(t*5)*.45:0;
   if(wheel.current)wheel.current.rotation.y=activity&&t<3?Math.sin(t*2)*.25:0;
   if(building.current)building.current.scale.y=celebrate?Math.min(1,.2+t):1;
   if((activity||celebrate)&&t<3)invalidate();
 });
 const tint=districts[id].color, styles=marks[id];
 return <group>
  <Model tint="#7a997a" part={["drum",[0,-.18,0],[3.5,.4,3.5]]}/>
  <Model tint="#c0ab83" part={["box",[0,.042,.92],[.48,.045,1.28]]}/>
  {seed[id].map((p,i)=><Model key={i} part={p} tint={tint}/>)}
  <group position={[-.78,0,.25]}><Model tint={tint} part={["cone",[0,.28,0],[.29,.5,.29]]}/><Model tint="#d2a178" part={["ball",[0,.59,0],[.25,.25,.25]]}/>
   <group ref={arm} position={[.12,.39,0]}><Model tint={tint} part={["box",[.12,.02,0],[.28,.08,.09]]}/></group></group>
  <group ref={building}>
  {stage>=2 && <group position={[.85,0,-.52]}><Model tint="#907356" part={["box",[0,.27,0],[.75,.48,.5]]}/><group ref={wheel}><Model tint={tint} part={[styles[0],[0,.72,0],[.86,.62,.7]]}/></group>{trim[id][0].map((part,k)=><Model key={k} part={part} tint={tint}/>)}</group>}
  {stage>=3 && <group position={[-.76,0,-.73]}><Model tint="#c0ab95" part={["box",[0,.42,0],[.85,.8,.56]]}/><Model tint={tint} part={[styles[1],[0,1.02,0],[1,.63,.76]]}/>{trim[id][1].map((part,k)=><Model key={k} part={part} tint={tint}/>)}</group>}
  {stage>=4 && <group position={[0,0,-1.05]}><Model tint="#e1cfad" part={["drum",[0,.8,0],[.66,1.58,.64]]}/><Model tint={tint} part={[styles[2],[0,1.75,0],[.88,.72,.85]]}/>{trim[id][2].map((part,k)=><Model key={k} part={part} tint={tint}/>)}</group>}
  </group>
 </group>;
}
export default function DistrictShore({ids,level,activity=false,celebrate=false,onExplore}:{ids:Interest[];level:number;activity?:boolean;celebrate?:boolean;onExplore?:(id:Interest)=>void}){
 return <group>{ids.map((id,i)=><group key={id} position={[(i-1)*4,0,0]} onClick={e=>{if(onExplore){e.stopPropagation();onExplore(id);}}}><District id={id} stage={stageAt(level)} activity={activity} celebrate={celebrate}/></group>)}
 {ids.slice(1).map((id,i)=><Model key={id} tint="#b19873" part={["box",[(i-.5)*4,.0,.64],[1.1,.13,.44]]}/>)}</group>;
}
