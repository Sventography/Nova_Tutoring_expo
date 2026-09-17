// app/_lib/islandDecorationCatalog.ts

export type IslandDecorationModel =
  | "stone"
  | "flower"
  | "bush"
  | "colored_bush"
  | "mushroom"
  | "bench"
  | "lantern"
  | "tree"
  | "alien_tree"
  | "cherry_tree"
  | "rainbow"
  | "crystal"
  | "glow_plant"
  | "ufo"
  | "pine_tree"
  | "palm_tree"
  | "meteor"
  | "moon_rock"
  | "alien_mushroom"
  | "grass_patch"
  | "tiny_planet"
  | "telescope"
  | "cosmic_arch"
  | "fence"
  | "pond"
  | "floating_rock"
  | "flower_bed"
  | "star_lantern"
  | "portal"
  | "fountain";

export type IslandDecorationCategory =
  | "path"
  | "nature"
  | "fantasy"
  | "cosmic"
  | "furniture"
  | "water";

export type IslandDecorationRarity =
  | "common"
  | "uncommon"
  | "rare";

export type IslandDecorationCatalogItem = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  price: number;
  previewEmoji: string;
  accent: string;
  secondaryAccent?: string;
  model: IslandDecorationModel;
  category: IslandDecorationCategory;
  rarity: IslandDecorationRarity;
  defaultScale: number;
  minScale: number;
  maxScale: number;
};

export const ISLAND_DECORATION_CATALOG: IslandDecorationCatalogItem[] = [
  { id: "path_stone", title: "Path Stone", shortTitle: "Path Stone", description: "A tiny stepping stone for paths, courtyards, gardens, and trails.", price: 1, previewEmoji: "🪨", accent: "#cbd5e1", model: "stone", category: "path", rarity: "common", defaultScale: 1, minScale: 0.55, maxScale: 3.5 },
  { id: "starflower", title: "Starflower", shortTitle: "Starflower", description: "A bright little flower for borders, gardens, and colorful filler.", price: 2, previewEmoji: "🌼", accent: "#fde68a", model: "flower", category: "nature", rarity: "common", defaultScale: 1, minScale: 0.55, maxScale: 3.5 },
  { id: "glow_bush", title: "Glow Bush", shortTitle: "Glow Bush", description: "A lush rounded bush that makes empty areas feel alive.", price: 3, previewEmoji: "🌿", accent: "#86efac", model: "bush", category: "nature", rarity: "common", defaultScale: 1, minScale: 0.55, maxScale: 3.5 },
  { id: "moon_mushroom", title: "Moon Mushroom", shortTitle: "Mushroom", description: "A whimsical moonlit mushroom for forest corners and magical gardens.", price: 4, previewEmoji: "🍄", accent: "#c4b5fd", model: "mushroom", category: "fantasy", rarity: "common", defaultScale: 1, minScale: 0.55, maxScale: 3.5 },
  { id: "park_bench", title: "Starlight Bench", shortTitle: "Bench", description: "A cozy little bench for parks, paths, overlooks, and hangout spaces.", price: 8, previewEmoji: "🪑", accent: "#fdba74", model: "bench", category: "furniture", rarity: "common", defaultScale: 1, minScale: 0.65, maxScale: 3.5 },
  { id: "garden_lantern", title: "Garden Lantern", shortTitle: "Lantern", description: "A warm standing lantern that helps paths and sitting areas feel finished.", price: 10, previewEmoji: "🏮", accent: "#fef08a", model: "lantern", category: "furniture", rarity: "common", defaultScale: 1, minScale: 0.65, maxScale: 3.5 },
  { id: "young_tree", title: "Young Nova Tree", shortTitle: "Tree", description: "A medium tree for forests, parks, winding paths, and landscaped borders.", price: 12, previewEmoji: "🌳", accent: "#4ade80", model: "tree", category: "nature", rarity: "common", defaultScale: 1, minScale: 0.65, maxScale: 4.5 },
  { id: "mini_fountain", title: "Moonwell Fountain", shortTitle: "Fountain", description: "A small decorative fountain for plazas, gardens, and centerpiece areas.", price: 25, previewEmoji: "⛲", accent: "#7dd3fc", model: "fountain", category: "water", rarity: "uncommon", defaultScale: 1, minScale: 0.7, maxScale: 3.5 },

  { id: "azure_bush", title: "Azure Dream Bush", shortTitle: "Azure Bush", description: "A cool blue ornamental bush for colorful gardens and moonlit paths.", price: 4, previewEmoji: "🫐", accent: "#38bdf8", secondaryAccent: "#0ea5e9", model: "colored_bush", category: "nature", rarity: "common", defaultScale: 1, minScale: 0.55, maxScale: 3.5 },
  { id: "violet_bush", title: "Violet Nova Bush", shortTitle: "Violet Bush", description: "A rich violet bush dotted with tiny glowing berries.", price: 4, previewEmoji: "🪻", accent: "#a78bfa", secondaryAccent: "#7c3aed", model: "colored_bush", category: "nature", rarity: "common", defaultScale: 1, minScale: 0.55, maxScale: 3.5 },
  { id: "rose_bush", title: "Roseflare Bush", shortTitle: "Rose Bush", description: "A warm rose-colored bush that brings bright contrast to green spaces.", price: 4, previewEmoji: "🌺", accent: "#fb7185", secondaryAccent: "#e11d48", model: "colored_bush", category: "nature", rarity: "common", defaultScale: 1, minScale: 0.55, maxScale: 3.5 },
  { id: "golden_bush", title: "Golden Sun Bush", shortTitle: "Gold Bush", description: "A luminous golden shrub made for special gardens and glowing borders.", price: 6, previewEmoji: "✨", accent: "#facc15", secondaryAccent: "#f59e0b", model: "colored_bush", category: "fantasy", rarity: "uncommon", defaultScale: 1, minScale: 0.55, maxScale: 3.5 },

  { id: "cherry_blossom", title: "Nova Cherry Blossom", shortTitle: "Cherry Tree", description: "A soft pink blossom tree for peaceful gardens, paths, and study retreats.", price: 16, previewEmoji: "🌸", accent: "#f9a8d4", secondaryAccent: "#f472b6", model: "cherry_tree", category: "nature", rarity: "uncommon", defaultScale: 1, minScale: 0.7, maxScale: 4.5 },
  { id: "lunar_cherry", title: "Lunar Blossom Tree", shortTitle: "Lunar Blossom", description: "A moonlit lavender blossom tree with an otherworldly glow.", price: 24, previewEmoji: "🌸", accent: "#c4b5fd", secondaryAccent: "#8b5cf6", model: "cherry_tree", category: "fantasy", rarity: "rare", defaultScale: 1, minScale: 0.7, maxScale: 4.5 },

  { id: "nebula_tree", title: "Nebula Willow", shortTitle: "Nebula Tree", description: "An alien tree with dark twisting limbs and a glowing violet canopy.", price: 30, previewEmoji: "🌌", accent: "#a855f7", secondaryAccent: "#22d3ee", model: "alien_tree", category: "cosmic", rarity: "rare", defaultScale: 1, minScale: 0.72, maxScale: 4.5 },
  { id: "xenoflare_tree", title: "Xenoflare Halo Tree", shortTitle: "Xenoflare Tree", description: "A cyan-and-rose alien halo tree with a glowing ring suspended around its crown.", price: 36, previewEmoji: "🌳", accent: "#22d3ee", secondaryAccent: "#f472b6", model: "alien_tree", category: "cosmic", rarity: "rare", defaultScale: 1, minScale: 0.72, maxScale: 4.5 },
  { id: "nova_scout_ufo", title: "Nova Scout UFO", shortTitle: "Scout UFO", description: "A hovering cosmic scout craft with a luminous dome, glowing engine ring, and soft landing lights.", price: 42, previewEmoji: "🛸", accent: "#67e8f9", secondaryAccent: "#a78bfa", model: "ufo", category: "cosmic", rarity: "rare", defaultScale: 1, minScale: 0.6, maxScale: 4 },

  { id: "prism_rainbow", title: "Prism Rainbow", shortTitle: "Rainbow", description: "A cheerful rainbow arch for fantasy gardens and colorful island overlooks.", price: 20, previewEmoji: "🌈", accent: "#f472b6", secondaryAccent: "#38bdf8", model: "rainbow", category: "fantasy", rarity: "uncommon", defaultScale: 1, minScale: 0.7, maxScale: 4 },
  { id: "moonbow", title: "Celestial Moonbow", shortTitle: "Moonbow", description: "A rare cool-toned rainbow glowing with lunar blues, violets, and starlight.", price: 28, previewEmoji: "🌈", accent: "#818cf8", secondaryAccent: "#67e8f9", model: "rainbow", category: "cosmic", rarity: "rare", defaultScale: 1, minScale: 0.7, maxScale: 4 },

  { id: "crystal_cluster", title: "Dream Crystal Cluster", shortTitle: "Crystals", description: "A cluster of luminous crystals for magical gardens and hidden corners.", price: 10, previewEmoji: "💎", accent: "#c084fc", secondaryAccent: "#f0abfc", model: "crystal", category: "fantasy", rarity: "uncommon", defaultScale: 1, minScale: 0.55, maxScale: 3.5 },
  { id: "nova_crystal", title: "Nova Core Crystal", shortTitle: "Nova Crystal", description: "A bright cosmic crystal formation pulsing with cyan-blue light.", price: 18, previewEmoji: "💠", accent: "#22d3ee", secondaryAccent: "#3b82f6", model: "crystal", category: "cosmic", rarity: "rare", defaultScale: 1, minScale: 0.55, maxScale: 3.5 },

  { id: "glow_reeds", title: "Aurora Glow Reeds", shortTitle: "Glow Reeds", description: "Slender bioluminescent reeds that make paths and ponds feel enchanted.", price: 6, previewEmoji: "🌾", accent: "#5eead4", secondaryAccent: "#22d3ee", model: "glow_plant", category: "fantasy", rarity: "uncommon", defaultScale: 1, minScale: 0.55, maxScale: 3.5 },
  { id: "starfern", title: "Starfern", shortTitle: "Starfern", description: "A tiny alien fern with luminous tips, perfect for filling cosmic gardens.", price: 7, previewEmoji: "🌿", accent: "#86efac", secondaryAccent: "#a78bfa", model: "glow_plant", category: "cosmic", rarity: "uncommon", defaultScale: 0.9, minScale: 0.5, maxScale: 3.5 },
  { id: "crystal_pine", title: "Crystal Pine", shortTitle: "Crystal Pine", description: "A tall evergreen dusted with luminous crystal needles.", price: 18, previewEmoji: "🌲", accent: "#67e8f9", secondaryAccent: "#c4b5fd", model: "pine_tree", category: "fantasy", rarity: "uncommon", defaultScale: 1, minScale: 0.65, maxScale: 4.5 },
  { id: "frost_pine", title: "Frost Pine", shortTitle: "Frost Pine", description: "A cool blue-green pine for alpine corners and quiet study groves.", price: 12, previewEmoji: "🌲", accent: "#93c5fd", secondaryAccent: "#dbeafe", model: "pine_tree", category: "nature", rarity: "uncommon", defaultScale: 1, minScale: 0.65, maxScale: 4.5 },
  { id: "saturn_palm", title: "Saturn Palm", shortTitle: "Saturn Palm", description: "A strange cosmic palm with violet fronds and a starlit crown.", price: 24, previewEmoji: "🌴", accent: "#a78bfa", secondaryAccent: "#67e8f9", model: "palm_tree", category: "cosmic", rarity: "rare", defaultScale: 1, minScale: 0.65, maxScale: 4.5 },
  { id: "solar_palm", title: "Solar Palm", shortTitle: "Solar Palm", description: "A warm golden palm that makes bright island retreats feel tropical.", price: 14, previewEmoji: "🌴", accent: "#facc15", secondaryAccent: "#4ade80", model: "palm_tree", category: "nature", rarity: "uncommon", defaultScale: 1, minScale: 0.65, maxScale: 4.5 },

  { id: "meteor_fragment", title: "Meteor Fragment", shortTitle: "Meteor", description: "A scorched meteor fragment with a faint molten glow in its cracks.", price: 8, previewEmoji: "☄️", accent: "#fb923c", secondaryAccent: "#facc15", model: "meteor", category: "cosmic", rarity: "uncommon", defaultScale: 1, minScale: 0.5, maxScale: 3.5 },
  { id: "moon_rock_cluster", title: "Moon Rock Cluster", shortTitle: "Moon Rocks", description: "A small pile of pale cratered stones from somewhere far beyond Nova.", price: 5, previewEmoji: "🌑", accent: "#cbd5e1", secondaryAccent: "#94a3b8", model: "moon_rock", category: "cosmic", rarity: "common", defaultScale: 1, minScale: 0.5, maxScale: 3.5 },

  { id: "lunar_mushroom_grove", title: "Lunar Mushroom Grove", shortTitle: "Lunar Grove", description: "A cluster of glowing lavender mushrooms for magical forest pockets.", price: 9, previewEmoji: "🍄", accent: "#c4b5fd", secondaryAccent: "#f0abfc", model: "alien_mushroom", category: "fantasy", rarity: "uncommon", defaultScale: 1, minScale: 0.5, maxScale: 3.5 },
  { id: "nebula_mushroom_grove", title: "Nebula Mushroom Grove", shortTitle: "Nebula Grove", description: "Cyan-and-violet alien mushrooms pulsing softly beneath their caps.", price: 14, previewEmoji: "🍄", accent: "#22d3ee", secondaryAccent: "#8b5cf6", model: "alien_mushroom", category: "cosmic", rarity: "rare", defaultScale: 1, minScale: 0.5, maxScale: 3.5 },

  { id: "aurora_grass", title: "Aurora Grass Patch", shortTitle: "Aurora Grass", description: "A cheap patch of glowing grass for filling larger landscapes.", price: 3, previewEmoji: "🌱", accent: "#5eead4", secondaryAccent: "#86efac", model: "grass_patch", category: "fantasy", rarity: "common", defaultScale: 1, minScale: 0.45, maxScale: 3.5 },
  { id: "stardust_grass", title: "Stardust Grass Patch", shortTitle: "Stardust Grass", description: "Dark cosmic grass tipped with tiny violet points of light.", price: 4, previewEmoji: "🌱", accent: "#a78bfa", secondaryAccent: "#67e8f9", model: "grass_patch", category: "cosmic", rarity: "common", defaultScale: 1, minScale: 0.45, maxScale: 3.5 },

  { id: "tiny_saturn", title: "Tiny Saturn", shortTitle: "Tiny Saturn", description: "A miniature ringed planet hovering just above the island.", price: 22, previewEmoji: "🪐", accent: "#fde68a", secondaryAccent: "#c4b5fd", model: "tiny_planet", category: "cosmic", rarity: "rare", defaultScale: 1, minScale: 0.55, maxScale: 4 },
  { id: "tiny_neptune", title: "Tiny Neptune", shortTitle: "Tiny Neptune", description: "A tiny deep-blue planet with a glowing cyan orbital ring.", price: 22, previewEmoji: "🔵", accent: "#3b82f6", secondaryAccent: "#67e8f9", model: "tiny_planet", category: "cosmic", rarity: "rare", defaultScale: 1, minScale: 0.55, maxScale: 4 },

  { id: "star_telescope", title: "Starlight Telescope", shortTitle: "Telescope", description: "A compact observatory telescope aimed toward Nova's night sky.", price: 18, previewEmoji: "🔭", accent: "#67e8f9", secondaryAccent: "#c4b5fd", model: "telescope", category: "furniture", rarity: "uncommon", defaultScale: 1, minScale: 0.6, maxScale: 4 },
  { id: "crystal_arch", title: "Prism Crystal Arch", shortTitle: "Crystal Arch", description: "A glowing ceremonial arch built from violet crystal and cyan light.", price: 32, previewEmoji: "✨", accent: "#c084fc", secondaryAccent: "#22d3ee", model: "cosmic_arch", category: "fantasy", rarity: "rare", defaultScale: 1, minScale: 0.6, maxScale: 4 },
  { id: "crystal_fence", title: "Crystal Fence Section", shortTitle: "Crystal Fence", description: "A luminous fence section for building borders, gardens, and paths.", price: 5, previewEmoji: "💎", accent: "#a78bfa", secondaryAccent: "#67e8f9", model: "fence", category: "fantasy", rarity: "uncommon", defaultScale: 1, minScale: 0.5, maxScale: 3.5 },

  { id: "moon_pond", title: "Moonlight Pond", shortTitle: "Moon Pond", description: "A calm luminous pond edged with stone and moon-blue water.", price: 24, previewEmoji: "💧", accent: "#38bdf8", secondaryAccent: "#c4b5fd", model: "pond", category: "water", rarity: "rare", defaultScale: 1, minScale: 0.6, maxScale: 4 },
  { id: "floating_asteroid", title: "Floating Asteroid", shortTitle: "Asteroid", description: "A small asteroid hovering over a soft violet anti-gravity glow.", price: 12, previewEmoji: "🪨", accent: "#a78bfa", secondaryAccent: "#64748b", model: "floating_rock", category: "cosmic", rarity: "uncommon", defaultScale: 1, minScale: 0.5, maxScale: 4 },

  { id: "wildflower_bed", title: "Nova Wildflower Bed", shortTitle: "Flower Bed", description: "A colorful low flower bed made for paths, gardens, and cottage corners.", price: 4, previewEmoji: "🌷", accent: "#fb7185", secondaryAccent: "#fde68a", model: "flower_bed", category: "nature", rarity: "common", defaultScale: 1, minScale: 0.5, maxScale: 3.5 },
  { id: "nova_star_lantern", title: "Nova Star Lantern", shortTitle: "Star Lantern", description: "A tall lantern crowned with a brilliant floating star.", price: 12, previewEmoji: "⭐", accent: "#fde047", secondaryAccent: "#67e8f9", model: "star_lantern", category: "furniture", rarity: "uncommon", defaultScale: 1, minScale: 0.6, maxScale: 4 },
  { id: "nova_portal", title: "Nova Portal", shortTitle: "Nova Portal", description: "A rare standing portal ring shimmering with cyan and violet energy.", price: 48, previewEmoji: "🌀", accent: "#22d3ee", secondaryAccent: "#a78bfa", model: "portal", category: "cosmic", rarity: "rare", defaultScale: 1, minScale: 0.6, maxScale: 4 },

];

export const ISLAND_DECORATION_CATALOG_BY_ID =
  Object.fromEntries(
    ISLAND_DECORATION_CATALOG.map((item) => [item.id, item])
  ) as Record<string, IslandDecorationCatalogItem>;
