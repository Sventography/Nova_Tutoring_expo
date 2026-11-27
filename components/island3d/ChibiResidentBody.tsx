import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import ChibiHead from "./ChibiHead";
import { mergePaintedParts, type PaintedPart } from "./chibiGeometry";

type Variant = "star_throw" | "party_3d" | "party_3d_2";
type Vec3 = [number, number, number];

/** Static figurine geometry; the island owns movement and every action prop. */
export function createChibiBodyGeometry(variant: Variant) {
  const neon = variant === "party_3d_2";
  const dress = neon ? "#8652ce" : "#d8495e";
  const trim = neon ? "#8be0e1" : "#f8d98b";
  const shoe = neon ? "#343057" : "#813b51";
  const skin = "#f5d0c5";
  const parts: PaintedPart[] = [];
  const ball = (position: Vec3, scale: Vec3, color: string) => {
    parts.push({ geometry: new THREE.SphereGeometry(1, 16, 12), position, scale, color });
  };
  const limb = (from: Vec3, to: Vec3, radius: number, color: string) => {
    const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to);
    const direction = end.clone().sub(start);
    const geometry = new THREE.CapsuleGeometry(radius, Math.max(0, direction.length() - 2 * radius), 4, 12);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
    parts.push({ geometry, position: start.add(end).multiplyScalar(0.5).toArray() as Vec3, color });
  };

  for (const side of [-1, 1]) {
    limb([side * 0.12, 0.09, 0], [side * 0.12, 0.32, 0], 0.062, skin);
    ball([side * 0.12, 0.035, 0.05], [0.105, 0.072, 0.15], shoe);
    ball([side * 0.12, 0.078, 0.075], [0.095, 0.016, 0.043], trim);
  }

  // A rounded closed bell has a soft hem and real volume from every angle.
  const profile = [
    [0.001, 0.205], [0.17, 0.205], [0.25, 0.215], [0.282, 0.24],
    [0.29, 0.28], [0.28, 0.34], [0.255, 0.41], [0.217, 0.49],
    [0.184, 0.56], [0.15, 0.6], [0.001, 0.6],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  parts.push({ geometry: new THREE.LatheGeometry(profile, 24), scale: [1, 1, 0.86], color: dress });
  ball([0, 0.615, 0], [0.187, 0.167, 0.145], dress);
  ball([0, 0.77, 0], [0.075, 0.08, 0.07], skin);
  parts.push({ geometry: new THREE.TorusGeometry(0.279, 0.017, 6, 24), position: [0, 0.24, 0], rotation: [Math.PI / 2, 0, 0], scale: [1, 0.86, 1], color: trim });
  parts.push({ geometry: new THREE.TorusGeometry(0.172, 0.016, 6, 20), position: [0, 0.56, 0], rotation: [Math.PI / 2, 0, 0], scale: [1, 0.78, 1], color: trim });
  for (const side of [-1, 1]) ball([side * 0.055, 0.66, 0.137], [0.066, 0.046, 0.028], trim);
  ball([0, 0.66, 0.163], [0.027, 0.033, 0.025], trim);

  for (const side of [-1, 1]) {
    const raised = variant === "star_throw" && side === 1;
    const shoulder: Vec3 = [side * 0.19, 0.66, 0];
    const hand: Vec3 = raised ? [0.49, 0.96, 0.035] : [side * 0.35, 0.48, 0.045];
    limb(shoulder, hand, 0.058, skin);
    ball(shoulder, [0.095, 0.09, 0.093], dress);
    ball(hand, [0.072, 0.076, 0.065], skin);
  }
  return mergePaintedParts(parts);
}

export default function ChibiResidentBody({ variant }: { variant: Variant }) {
  const body = useMemo(() => createChibiBodyGeometry(variant), [variant]);
  useEffect(() => () => body.dispose(), [body]);
  return (
    <group>
      <mesh geometry={body}>
        <meshStandardMaterial vertexColors roughness={0.6} />
      </mesh>
      <group position={[0, 1.075, 0.025]}>
        <ChibiHead skin="#f5d0c5" hair="#35283f" iris={variant === "party_3d_2" ? "#5b4c93" : "#694254"} hairStyle="bob" />
      </group>
    </group>
  );
}
