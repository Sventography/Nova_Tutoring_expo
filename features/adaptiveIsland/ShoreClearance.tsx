import React,{useLayoutEffect,useRef} from "react";
import {Box3,Group,InstancedMesh,Matrix4,Mesh,Object3D,Vector3} from "three";
import {useThree} from "../../components/islandFiber";
import {DISTRICT_SHORE_X as x} from "./districts";

// Reserve all three final-stage plots and both approach bridges, even for one interest.
// Zero ownership mutations: an unexpected mesh in this parcel defers the whole shore.
const parcel=new Box3(new Vector3(x-6.2,-.6,-2.2),new Vector3(x+6.2,3.2,2.2));
export default function ShoreClearance({children,revision,onResult}:{
 children:React.ReactNode;revision:readonly unknown[];onResult:(clear:boolean)=>void;
}){
 const root=useRef<Group>(null);
 const scene=useThree(s=>s.scene);
 useLayoutEffect(()=>{
  if(!root.current)return;
  const shore=root.current, bounds=new Box3(),instance=new Matrix4();
  scene.updateMatrixWorld(true);
  let clear=true;
  scene.traverse(node=>{
   if(!clear||!(node instanceof Mesh))return;
   for(let p:Object3D|null=node;p;p=p.parent)if(p===shore)return;
   const g=node.geometry;
   if(!g)return;
   if(!g.boundingBox)g.computeBoundingBox();
   if(!g.boundingBox){clear=false;return;}
   if(node instanceof InstancedMesh){
    for(let i=0;clear&&i<node.count;i++){
      node.getMatrixAt(i,instance);
      if(parcel.intersectsBox(bounds.copy(g.boundingBox).applyMatrix4(instance).applyMatrix4(node.matrixWorld)))clear=false;
    }
   }else if(parcel.intersectsBox(bounds.copy(g.boundingBox).applyMatrix4(node.matrixWorld)))clear=false;
  });
  shore.visible=clear;
  onResult(clear);
 },[scene,onResult,...revision]);
 return <group ref={root} position={[x,0,0]}>{children}</group>;
}
