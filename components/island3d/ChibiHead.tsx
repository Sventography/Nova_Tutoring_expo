import React, { useEffect, useMemo } from "react";
import type {} from "@react-three/fiber";
import {
  CatmullRomCurve3,
  Color,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import { mergePaintedParts, type PaintedPart } from "./chibiGeometry";

export type ChibiHeadProps = {
  skin?: string;
  hair?: string;
  iris?: string;
  hairStyle?: "bob" | "crop";
};

type Vec3 = [number, number, number];
const orb = (
  color: string,
  position: Vec3,
  scale: Vec3,
  rotation: Vec3 = [0, 0, 0],
  segments = 14
): PaintedPart => ({
  geometry: new SphereGeometry(1, segments, Math.max(8, Math.round(segments * .7))),
  color, position, scale, rotation,
});

/** A complete, rounded face facing +Z. Two draws, with no textures or frame loop. */
export default function ChibiHead({
  skin = "#f5d0c5",
  hair = "#35283f",
  iris = "#604471",
  hairStyle = "bob",
}: ChibiHeadProps) {
  const geometries = useMemo(() => {
    const sheen = `#${new Color(hair).lerp(new Color("#bca4b9"), .10).getHexString()}`;
    const cheek = `#${new Color(skin).lerp(new Color("#ec7e91"), .42).getHexString()}`;
    const matte: PaintedPart[] = [
      orb(skin, [0, -.015, .018], [.32, .30, .28], [0, 0, 0], 24),
      orb(hair, [0, .016, -.065], [.345, .333, .265], [0, 0, 0], 20),
      // The cap stops above the eyes; its back stays fully dimensional on orbit.
      {
        geometry: new SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, 1.32),
        color: hair, position: [0, .025, -.025], scale: [.35, .33, .30],
      },
      orb(hair, [-.175, .17, .20], [.105, .092, .052], [0, -.18, .27]),
      orb(sheen, [-.025, .158, .246], [.115, .085, .043], [0, 0, .12]),
      orb(hair, [.135, .17, .215], [.104, .088, .052], [0, .22, -.25]),
      orb(skin, [0, -.073, .282], [.023, .021, .029]),
      {
        geometry: new TubeGeometry(new CatmullRomCurve3([
          new Vector3(-.036, -.112, .279),
          new Vector3(0, -.132, .283),
          new Vector3(.036, -.112, .279),
        ]), 12, .006, 5, false),
        color: "#854858",
      },
    ];
    const eyes: PaintedPart[] = [];
    for (const side of [-1, 1]) {
      matte.push(
        orb(skin, [side * .303, -.02, .02], [.045, .06, .043]),
        orb(cheek, [side * .205, -.07, .232], [.044, .024, .009], [0, side * .60, 0]),
        hairStyle === "bob"
          ? orb(hair, [side * .293, -.07, -.005], [.073, .246, .155], [0, 0, side * -.05])
          : orb(hair, [side * .30, .015, -.05], [.052, .13, .12], [0, 0, side * -.08])
      );
      const x = side * .115;
      eyes.push(
        orb("#241e2e", [x, .018, .274], [.052, .074, .028]),
        orb(iris, [x, .006, .296], [.036, .047, .017]),
        orb("#171420", [x, .012, .309], [.019, .035, .009]),
        orb("#fffaf4", [x - .014, .042, .317], [.012, .016, .005], [0, 0, 0], 10)
      );
    }
    return { matte: mergePaintedParts(matte), eyes: mergePaintedParts(eyes) };
  }, [skin, hair, iris, hairStyle]);

  useEffect(() => () => {
    // Owned geometry retains its CPU attributes, so StrictMode replay can reupload it.
    geometries.matte.dispose();
    geometries.eyes.dispose();
  }, [geometries]);

  return <group>
    <mesh geometry={geometries.matte}>
      <meshStandardMaterial vertexColors roughness={.68} metalness={0} />
    </mesh>
    <mesh geometry={geometries.eyes}>
      <meshStandardMaterial vertexColors roughness={.27} metalness={0} />
    </mesh>
  </group>;
}
