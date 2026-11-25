import React from "react";
import { View } from "react-native";
import { Canvas } from "../../components/islandFiber";
import type { Interest } from "../../app/_lib/discoveryModel";
import { growth } from "./preferences";

type Vec = [number, number, number];
function Block({ at, size, color, tilt = 0 }: { at: Vec; size: Vec; color: string; tilt?: number }) {
  return <mesh position={at} rotation={[0,0,tilt]}><boxGeometry args={size}/><meshStandardMaterial color={color}/></mesh>;
}
function Orb({ at, size, color }: { at: Vec; size: number; color: string }) {
  return <mesh position={at}><sphereGeometry args={[size,12,8]}/><meshStandardMaterial color={color}/></mesh>;
}
function Pavilion({ theme, stage }: { theme: Interest; stage: number }) {
  if (theme === "music") return <group>
    {[0,1,2,3].map(i => <Block key={i} at={[(i-1.5)*0.31,0.45+i*0.13,0]} size={[0.22,0.8+i*0.26,0.28]} color={["#eebf67","#ef946e","#a994dd","#79bdc8"][i]}/>)}
    {stage >= 2 && <Block at={[0,0.17,0.65]} size={[1.3,0.24,0.4]} color="#bd8354"/>}
    {stage >= 3 && <Block at={[0,1.55,-0.48]} size={[1.85,0.12,0.85]} color="#e9ad67"/>}
  </group>;
  if (theme === "art") return <group>
    {[-1,1].map(d => <Block key={d} at={[d*0.29,0.5,0]} size={[0.10,1.04,0.14]} tilt={d*0.20} color="#9a633a"/>)}
    <Block at={[0,0.96,0.08]} size={[1.02,0.84,0.1]} color="#ffdfaa"/>
    <Orb at={[-0.16,1.05,0.14]} size={0.20} color="#ed7769"/>
    {stage >= 2 && <Block at={[0.26,0.86,0.15]} size={[0.35,0.12,0.05]} tilt={0.28} color="#4ca797"/>}
    {stage >= 3 && <Orb at={[0.76,0.39,0]} size={0.35} color="#bb84dd"/>}
  </group>;
  if (theme === "space") return <group>
    <Block at={[0,0.43,0]} size={[0.18,0.85,0.18]} color="#beb7cb"/>
    <mesh position={[0,0.92,0]} rotation={[0,0,-0.85]}><cylinderGeometry args={[0.22,0.15,1.1,12]}/><meshStandardMaterial color="#8398e3"/></mesh>
    {stage >= 2 && <Orb at={[-0.7,1.28,-0.15]} size={0.22} color="#eac46e"/>}
    {stage >= 3 && <Orb at={[0.65,1.48,0]} size={0.14} color="#97d3d0"/>}
  </group>;
  return null;
}
export default function Garden({ interests, level }: { interests: Interest[]; level: number }) {
  return <View style={{height:250}} accessible accessibilityLabel="Private 3D interest garden">
    <Canvas camera={{position:[0,3.2,7.2],rotation:[-0.31,0,0],fov:43}} dpr={[1,1.5]} frameloop="demand">
      <ambientLight intensity={1.6}/><directionalLight position={[3,6,4]} intensity={2}/>
      {interests.map((id,i) => <group key={id} position={[(i-(interests.length-1)/2)*2.3,0,0]}>
        <mesh position={[0,-0.2,0]}><cylinderGeometry args={[1.06,0.70,0.4,20]}/><meshStandardMaterial color="#698b74"/></mesh>
        <Pavilion theme={id} stage={growth(level)}/>
      </group>)}
    </Canvas>
  </View>;
}
