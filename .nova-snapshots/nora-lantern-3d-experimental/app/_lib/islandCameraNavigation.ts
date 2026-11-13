// Camera-only navigation helpers shared by web drag gestures and BUILD
// on-screen camera buttons. These never modify decoration placements.
// Keep camera targets bounded so the user cannot lose the island.
export type IslandCameraTarget = [number, number, number];

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

/**
 * Move the camera target in the island ground plane.
 * dxPixels and dyPixels are relative to the screen, NOT island X/Z.
 * Positive dx means dragging the viewport right (the island appears to
 * move right); current azimuth is used so panning stays intuitive.
 */
export function panIslandCameraTarget(
  startTarget: IslandCameraTarget,
  azimuth: number,
  dxPixels: number,
  dyPixels: number,
  cameraDistance: number
): IslandCameraTarget {
  const unitsPerPixel = clamp(cameraDistance / 1250, 0.007, 0.02);
  const rightX = Math.cos(azimuth);
  const rightZ = -Math.sin(azimuth);
  const downX = Math.sin(azimuth);
  const downZ = Math.cos(azimuth);
  const deltaX = (dxPixels * rightX + dyPixels * downX) * unitsPerPixel;
  const deltaZ = (dxPixels * rightZ + dyPixels * downZ) * unitsPerPixel;
  return [
    clamp(startTarget[0] - deltaX, -21, 21),
    startTarget[1],
    clamp(startTarget[2] - deltaZ, -21, 21),
  ];
}

export function orbitIslandCamera(
  startAzimuth: number,
  startPolar: number,
  dxPixels: number,
  dyPixels: number
): { azimuth: number; polar: number } {
  return {
    azimuth: startAzimuth - dxPixels * 0.005,
    polar: clamp(startPolar + dyPixels * 0.0035, 0.38, 1.34),
  };
}
