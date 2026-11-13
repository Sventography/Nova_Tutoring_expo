// app/_lib/islandBuilderCatalog.ts
export type IslandLandmassId =
  | "central"
  | "castle_reach"
  | "starport_dock"
  | "crystal_wilds"
  | "moon_temple";

export type IslandTransform = {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  scale: number;
};

export type IslandBuilderCatalogItem = {
  id: string;
  title: string;
  shortTitle: string;
  unlockLevel: number;
  landmassId: IslandLandmassId;
  category: "landmark" | "nature" | "water";
  icon: string;
  unique: boolean;
  defaultTransform: IslandTransform;
};

function catalogItem(
  id: string,
  title: string,
  shortTitle: string,
  unlockLevel: number,
  landmassId: IslandLandmassId,
  category: IslandBuilderCatalogItem["category"],
  icon: string,
  x: number,
  y: number,
  z: number
): IslandBuilderCatalogItem {
  return {
    id,
    title,
    shortTitle,
    unlockLevel,
    landmassId,
    category,
    icon,
    unique: true,
    defaultTransform: {
      x,
      y,
      z,
      rotationY: 0,
      scale: 1,
    },
  };
}

/*
 * These coordinates intentionally mirror the pre-builder 3D island so the
 * first migration preserves the player's existing visual layout.
 */
export const ISLAND_BUILDER_CATALOG: IslandBuilderCatalogItem[] = [
  catalogItem("study_grove", "Study Grove", "Grove", 1, "central", "nature", "leaf-outline", -4.45, 1.08, -1.1),
  catalogItem("starlight_garden", "Starlight Garden", "Garden", 2, "central", "nature", "flower-outline", -2.95, 0.98, 2.8),
  catalogItem("nova_library", "Nova Library", "Library", 3, "central", "landmark", "library-outline", 0.2, 1.12, -1.5),
  catalogItem("whisperwind_mill", "Whisperwind Mill", "Windmill", 4, "central", "landmark", "sync-circle-outline", -2.45, 1.08, -3.55),
  catalogItem("learning_falls", "Learning Falls", "Waterfall", 5, "central", "water", "water-outline", 3.2, 0.82, 2.7),
  catalogItem("moonwell", "Moonwell", "Well", 6, "central", "landmark", "sparkles-outline", -0.45, 0.98, 1.75),
  catalogItem("sky_observatory", "Sky Observatory", "Observatory", 7, "central", "landmark", "planet-outline", 4.2, 1.1, -1.25),
  catalogItem("companion_habitat", "Companion Habitat", "Habitat", 10, "central", "landmark", "paw-outline", 1.75, 0.94, -4.2),
  catalogItem("castle_reach", "Castle Reach", "Castle", 12, "castle_reach", "landmark", "business-outline", -9.15, 1.12, -0.95),
  catalogItem("starport_dock", "Starport Dock", "Starport", 15, "starport_dock", "landmark", "rocket-outline", 9.1, 1.05, 1.5),
  catalogItem("crystal_wilds", "Crystal Wilds", "Crystals", 18, "crystal_wilds", "nature", "diamond-outline", 1.5, 1.08, -9.05),
  catalogItem("moon_temple", "Moon Temple", "Temple", 21, "moon_temple", "landmark", "moon-outline", -1.1, 1.08, 8.8),
];

export const ISLAND_BUILDER_CATALOG_BY_ID =
  Object.fromEntries(
    ISLAND_BUILDER_CATALOG.map((item) => [item.id, item])
  ) as Record<string, IslandBuilderCatalogItem>;

export function getUnlockedIslandBuilderItems(
  islandLevel: number
): IslandBuilderCatalogItem[] {
  const level = Math.max(1, Math.floor(Number(islandLevel) || 1));
  return ISLAND_BUILDER_CATALOG.filter(
    (item) => item.unlockLevel <= level
  );
}
