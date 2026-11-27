import {
  BufferGeometry,
  Color,
  Euler,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  Vector3,
} from "three";

type Vec3 = [number, number, number];

export type PaintedPart = {
  geometry: BufferGeometry;
  color: string;
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
};

/** Merge local, independently owned parts into one lit, vertex-colored draw.
 * Consumes and disposes the supplied geometries; the caller owns the result.
 */
export function mergePaintedParts(parts: PaintedPart[]): BufferGeometry {
  const matrix = new Matrix4();
  const position = new Vector3();
  const rotation = new Quaternion();
  const scale = new Vector3();
  const color = new Color();
  const geometries = parts.map((part) => {
    const geometry = part.geometry.index
      ? part.geometry.toNonIndexed()
      : part.geometry;
    if (geometry !== part.geometry) part.geometry.dispose();
    matrix.compose(
      position.set(...(part.position ?? [0, 0, 0])),
      rotation.setFromEuler(new Euler(...(part.rotation ?? [0, 0, 0]))),
      scale.set(...(part.scale ?? [1, 1, 1]))
    );
    geometry.applyMatrix4(matrix);
    if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
    return geometry;
  });
  const count = geometries.reduce(
    (total, geometry) => total + geometry.getAttribute("position").count,
    0
  );
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  let offset = 0;
  geometries.forEach((geometry, index) => {
    const points = geometry.getAttribute("position");
    const directions = geometry.getAttribute("normal");
    color.set(parts[index].color);
    for (let vertex = 0; vertex < points.count; vertex++) {
      positions[offset] = points.getX(vertex);
      positions[offset + 1] = points.getY(vertex);
      positions[offset + 2] = points.getZ(vertex);
      normals[offset] = directions.getX(vertex);
      normals[offset + 1] = directions.getY(vertex);
      normals[offset + 2] = directions.getZ(vertex);
      colors[offset] = color.r;
      colors[offset + 1] = color.g;
      colors[offset + 2] = color.b;
      offset += 3;
    }
    geometry.dispose();
  });
  const merged = new BufferGeometry();
  merged.setAttribute("position", new Float32BufferAttribute(positions, 3));
  merged.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  merged.setAttribute("color", new Float32BufferAttribute(colors, 3));
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}
