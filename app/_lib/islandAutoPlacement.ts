// Collision-aware ground placement. Existing saved layouts are never moved.
// Approximate circular footprints are intentionally conservative and cheap on mobile.
import { NOVA_MAIN_BUILD_RADIUS, isIslandBuildPositionValid } from "./islandBuilderBounds";
import { ISLAND_DECORATION_CATALOG_BY_ID } from "./islandDecorationCatalog";
import { ISLAND_BUILDER_CATALOG_BY_ID } from "./islandBuilderCatalog";

export type GroundObstacle = { x: number; z: number; radius: number };
export type GroundPoint = { x: number; z: number };

// Decorations and Nova share the island's parent group. Coordinates here are
// group-local, matching NOVA_PEDESTAL_WORLD in NovaIsland3DScene.tsx.
export const NOVA_PEDESTAL_GROUND_OBSTACLE: GroundObstacle = {
  x: -3,
  z: 1.6,
  radius: 2.75,
};

// A visually separate place for the unique castle, opposite Nova and
// her pedestal at the default camera azimuth.
export const COLLECTOR_CASTLE_PREFERRED_GROUND: GroundPoint = {
  x: 10,
  z: -10,
};
const MODEL_RADII: Record<string, number> = {
  stone: 0.35, flower: 0.32, grass_patch: 0.65, bush: 0.65,
  colored_bush: 0.7, mushroom: 0.42, bench: 0.95, lantern: 0.48,
  star_lantern: 0.55, tree: 1.2, alien_tree: 1.35,
  cherry_tree: 1.45, pine_tree: 1.1, palm_tree: 1.3,
  fountain: 1.25, pond: 1.55, rainbow: 1.6, portal: 1.4,
  cosmic_arch: 1.5, telescope: 0.9, fence: 0.9,
  flower_bed: 0.9, ufo: 1.45, meteor: 1.2, moon_rock: 0.85,
  floating_rock: 1, crystal: 0.7, glow_plant: 0.55,
  alien_mushroom: 0.6, tiny_planet: 0.8,
  // The #017 castle is NOT a small item: foundation radius 3.05 plus
  // a long royal approach (+Z ~4.1 units). Leave room to walk around it.
  noras_last_lantern: 4.8,
};
export function decorationGroundRadius(itemId: string, scale = 1): number {
  const model = ISLAND_DECORATION_CATALOG_BY_ID[itemId]?.model;
  return (model ? MODEL_RADII[model] ?? 0.8 : 0.8) * Math.max(0.2, scale);
}
export function findNearestFreeGround(
  preferred: GroundPoint,
  radius: number,
  obstacles: readonly GroundObstacle[],
  options: { gap?: number; step?: number; maxDistance?: number } = {}
): GroundPoint | null {
  const gap = Math.max(0, options.gap ?? 0.25);
  const step = Math.max(0.1, options.step ?? 0.65);
  const maxDistance = Math.min(52, Math.max(0, options.maxDistance ?? 26));
  if (![preferred.x, preferred.z, radius, gap, step, maxDistance].every(Number.isFinite)) return null;
  const fits = (x: number, z: number) =>
    Number.isFinite(radius) && radius >= 0 &&
    Math.hypot(x, z) + radius <= NOVA_MAIN_BUILD_RADIUS &&
    isIslandBuildPositionValid(x, z, 1 + radius * 2) &&
    obstacles.every(o => {
      const dx = x - o.x, dz = z - o.z;
      const separation = radius + o.radius + gap;
      return dx * dx + dz * dz >= separation * separation;
    });
  if (fits(preferred.x, preferred.z)) return { ...preferred };
  for (let distance = step; distance <= maxDistance; distance += step) {
    const samples = Math.max(12, Math.ceil(2 * Math.PI * distance / step));
    for (let i = 0; i < samples; i++) {
      const angle = (i / samples) * Math.PI * 2;
      const x = preferred.x + Math.cos(angle) * distance;
      const z = preferred.z + Math.sin(angle) * distance;
      if (fits(x, z)) return { x, z };
    }
  }
  return null;
}

export function landmarkGroundRadius(itemId: string, scale = 1): number {
  const item = ISLAND_BUILDER_CATALOG_BY_ID[itemId];
  const base = item?.category === "nature" ? 1.65
    : item?.category === "water" ? 2.2 : 2.1;
  return base * Math.max(0.3, scale);
}
export function overlapsGround(
  point: GroundPoint, radius: number,
  obstacles: readonly GroundObstacle[], gap = 0.2
): boolean {
  return obstacles.some(o => {
    const dx = point.x - o.x, dz = point.z - o.z;
    const min = radius + o.radius + gap;
    return dx * dx + dz * dz < min * min;
  });
}
