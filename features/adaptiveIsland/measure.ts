import {Box3,InstancedMesh,Matrix4,Mesh,SkinnedMesh,Object3D,Vector3} from "three";
import type {Box,Item} from "./placement";

// Measure child geometry in placement-local space, including nested transforms.
// Unknown animated geometry needs an authored swept envelope or stays protected.
export function measurePlacement(root:Object3D, clearance=0):Box[]|null {
 if(!Number.isFinite(clearance)||clearance<0)return null;
 root.updateWorldMatrix(true,true);
 if(Math.abs(root.matrixWorld.determinant())<1e-9)return null;
 const inverse=new Matrix4().copy(root.matrixWorld).invert();
 const parts:Box[]=[];let unsupported=false;
 root.traverse(node=>{
   if(!node.visible || !(node instanceof Mesh))return;
   if(node instanceof SkinnedMesh || node.morphTargetInfluences?.length){unsupported=true;return;}
   const pos=node.geometry?.attributes?.position;
   if(!pos || pos.count===0){unsupported=true;return;}
   const transform=new Matrix4().multiplyMatrices(inverse,node.matrixWorld);
   const count=node instanceof InstancedMesh?node.count:1;
   for(let n=0;n<count;n++){
     const matrix=transform.clone();
     if(node instanceof InstancedMesh){
       const instance=new Matrix4();node.getMatrixAt(n,instance);matrix.multiply(instance);
     }
     const extent=new Box3(),vertex=new Vector3();
     for(let i=0;i<pos.count;i++)extent.expandByPoint(vertex.fromBufferAttribute(pos,i).applyMatrix4(matrix));
     const center=extent.getCenter(new Vector3()),size=extent.getSize(new Vector3());
     if(![center.x,center.z,size.x,size.z].every(Number.isFinite)){unsupported=true;return;}
     parts.push({x:center.x,z:center.z,w:Math.max(.001,size.x)+2*clearance,d:Math.max(.001,size.z)+2*clearance,angle:0});
   }
 });
 return unsupported||parts.length===0?null:parts;
}

// Both placement renderers supply a Three group. Read its world basis so the
// rotating parent Island and offsets use the same units as measured reserves.
export function measuredItem(root:Object3D, identity:Pick<Item,"id"|"provider"|"surface"|"movable">):Item|null{
 const parts=measurePlacement(root);
 if(!parts)return null;
 const e=root.matrixWorld.elements,scale=Math.hypot(e[0],e[2]);
 if(!e.every(Number.isFinite)||scale<=0||e[5]<=0||root.matrixWorld.determinant()<=0)return null;
 const epsilon=1e-6*scale;
 if([e[1],e[4],e[6],e[9],e[0]-e[10],e[2]+e[8]].some(v=>Math.abs(v)>epsilon))return null;
 return {...identity,parts,x:e[12],z:e[14],scale,angle:Math.atan2(-e[2],e[0])};
}
