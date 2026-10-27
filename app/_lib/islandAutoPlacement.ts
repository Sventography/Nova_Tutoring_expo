// Collision-aware ground placement. Existing saved layouts are never moved.
// Approximate circular footprints are intentionally conservative and cheap on mobile.
import { isIslandBuildPositionValid } from "./islandBuilderBounds";
import { ISLAND_DECORATION_CATALOG_BY_ID } from "./islandDecorationCatalog";

export type GroundObstacle = { x: number; z: number; radius: number };
export type GroundPoint = { x: number; z: number };
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
  const gap = options.gap ?? 0.25;
  const step = options.step ?? 0.65;
  const maxDistance = options.maxDistance ?? 26;
  const fits = (x: number, z: number) =>
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
