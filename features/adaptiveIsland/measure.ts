import {Box3,InstancedMesh,Matrix4,Mesh,SkinnedMesh,Object3D,Vector3} from "three";
import type {Box} from "./placement";

// Measure child geometry in placement-local space, including nested transforms.
// Unknown animated/instanced geometry needs an authored swept envelope or stays protected.
export function measurePlacement(root:Object3D, clearance=0):Box[]|null {
 if(!Number.isFinite(clearance)||clearance<0)return null;
 root.updateWorldMatrix(true,true);
 if(Math.abs(root.matrixWorld.determinant())<1e-9)return null;
 const inverse=new Matrix4().copy(root.matrixWorld).invert();
 const parts:Box[]=[];let unsupported=false;
 root.traverse(node=>{
   if(!node.visible || !(node instanceof Mesh))return;
   if(node instanceof InstancedMesh || node instanceof SkinnedMesh || node.morphTargetInfluences?.length){unsupported=true;return;}
   const pos=node.geometry?.attributes?.position;
   if(!pos || pos.count===0){unsupported=true;return;}
   const transform=new Matrix4().multiplyMatrices(inverse,node.matrixWorld);
   const extent=new Box3(),vertex=new Vector3();
   for(let i=0;i<pos.count;i++)extent.expandByPoint(vertex.fromBufferAttribute(pos,i).applyMatrix4(transform));
   const center=extent.getCenter(new Vector3()),size=extent.getSize(new Vector3());
   if(![center.x,center.z,size.x,size.z].every(Number.isFinite)){unsupported=true;return;}
   parts.push({x:center.x,z:center.z,w:Math.max(.001,size.x)+2*clearance,d:Math.max(.001,size.z)+2*clearance,angle:0});
 });
 return unsupported||parts.length===0?null:parts;
}
