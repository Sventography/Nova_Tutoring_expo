// app/_lib/islandBuilderBounds.ts

export type IslandBuildPoint = { x: number; z: number; clamped: boolean };

export const NOVA_MAIN_ISLAND_RADIUS = 24;
export const NOVA_MAIN_BUILD_RADIUS = 23.1;

const marginForScale = (scale: number): number =>
  0.38 + Math.max(0, scale - 1) * 0.34;

export function isIslandBuildPositionValid(
  x: number,
  z: number,
  scale = 1,
  _itemId?: string
): boolean {
  const radius = Math.max(1, NOVA_MAIN_BUILD_RADIUS - marginForScale(scale));
  return x * x + z * z <= radius * radius;
}

export function clampIslandBuildPosition(
  x: number,
  z: number,
  scale = 1,
  _itemId?: string
): IslandBuildPoint {
  const radius = Math.max(1, NOVA_MAIN_BUILD_RADIUS - marginForScale(scale));
  const distance = Math.sqrt(x * x + z * z);

  if (distance <= radius || distance <= 0.0001) {
    return { x, z, clamped: false };
  }

  const ratio = radius / distance;
  return { x: x * ratio, z: z * ratio, clamped: true };
}
