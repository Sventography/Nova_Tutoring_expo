export const COINS_PER_DOLLAR = 1000;
export const dollarsToCoins = (usd: number) => Math.round(usd * COINS_PER_DOLLAR);

export type Category =
  | "plushies"
  | "clothing"
  | "tangibles"
  | "cursor"
  | "theme"
  | "bundle"
  | "coin_pack"
  | "ask_memory"
  | "ask_personality";

export const CATEGORY_BORDER: Record<Category, string> = {
  plushies: "#00e5ff",
  clothing: "#FFD700",
  tangibles: "#14b8a6",
  cursor: "#22c55e",
  theme: "#b67cff",
  bundle: "#f97316",
  coin_pack: "#f59e0b",
  ask_memory: "#38bdf8",
  ask_personality: "#ec4899",
};

export type CatalogItem = {
  id: string;
  title: string;
  desc?: string;
  category: Category;
  priceUSD?: number;
  priceCoins?: number;
  image?: any;
  altImageKey?: string;
  themeId?: string;

  askMemoryTier?: "tier1" | "tier2" | "tier3" | "tier4";
  askMemoryLimit?: number;

  askPersonalityKey?:
    | "encouraging"
    | "calm_focus"
    | "coach"
    | "playful"
    | "storyteller";

  meta?: Record<string, any>;
};

const img = {
  plushie_nova_front: require("../assets/shop/plushie_nova_pajamas_front.png"),
  plushie_nova_back: require("../assets/shop/plushie_nova_pajamas_back.png"),

  nova_bunny_book_plushie_front: require("../assets/shop/nova_bunny_book_plushie_front.png"),
  nova_bunny_book_plushie_back: require("../assets/shop/nova_bunny_book_plushie_back.png"),

  plushie_star_front: require("../assets/shop/plushie_star_front.png"),
  plushie_star_back: require("../assets/shop/plushie_star_back.png"),

  plushie_bunny_front: require("../assets/shop/plushie_bunny_front.png"),
  plushie_bunny_back: require("../assets/shop/plushie_bunny_back.png"),
  plushie_bunny_front_white: require("../assets/shop/plushie_bunny_front_white.png"),
  plushie_bunny_back_white: require("../assets/shop/plushie_bunny_back_white.png"),

  nova_plushie_devil_front: require("../assets/shop/nova_plushie_devil_front.png"),
  nova_plushie_devil_back: require("../assets/shop/nova_plushie_devil_back.png"),
  nova_plushie_purple_front: require("../assets/shop/nova_plushie_purple_front.png"),
  nova_plushie_purple_back: require("../assets/shop/nova_plushie_purple_back.png"),

  beanie: require("../assets/shop/beanie.png"),
  hoodie: require("../assets/shop/hoodie.png"),
  tee_front: require("../assets/shop/tee_front.png"),
  tee_front_glow: require("../assets/shop/tee_front_glow.png"),
  pajamas: require("../assets/shop/pajamas.png"),
  pajama_bottoms: require("../assets/shop/pajama_bottoms.png"),
  sweat_bottoms: require("../assets/shop/sweat_bottoms.png"),
  hat: require("../assets/shop/hat.png"),

  keychain: require("../assets/shop/keychain.png"),
  stationery: require("../assets/shop/stationery.png"),
  case: require("../assets/shop/case.png"),

  glow_cursor: require("../assets/shop/glow_cursor.png"),
  orb_cursor: require("../assets/shop/orb_cursor.png"),
  star_trail_cursor: require("../assets/shop/star_trail_cursor.png"),

  neon_theme: require("../assets/shop/neon_theme.png"),
  star_theme: require("../assets/shop/star_theme.png"),
  pink_theme: require("../assets/shop/pink_theme.png"),
  dark_theme: require("../assets/shop/dark_theme.png"),
  mint_theme: require("../assets/shop/mint_theme.png"),
  glitter_theme: require("../assets/shop/glitter_theme.png"),
  theme_black_gold: require("../assets/shop/theme_black_gold.png"),
  theme_crimson_dream: require("../assets/shop/theme_crimson_dream.png"),
  theme_emerald_wave: require("../assets/shop/theme_emerald_wave.png"),
  theme_neon_purple: require("../assets/shop/theme_neon_purple.png"),
  theme_silver_frost: require("../assets/shop/theme_silver_frost.png"),

  bundle_neon: require("../assets/shop/bundle_neon.png"),
  coins_1000: require("../assets/shop/coins_1000.png"),
  coins_5000: require("../assets/shop/coins_5000.png"),

  ask_memory_tier1_nova_notes: require("../assets/shop/ask/ask_memory_tier1_nova_notes.png"),
  ask_memory_tier2_nova_journal: require("../assets/shop/ask/ask_memory_tier2_nova_journal.png"),
  ask_memory_tier3_nova_vault: require("../assets/shop/ask/ask_memory_tier3_nova_vault.png"),
  ask_memory_tier4_nova_galaxy_archive: require("../assets/shop/ask/ask_memory_tier4_nova_galaxy_archive.png"),

  ask_personality_calm_focus: require("../assets/shop/ask/ask_personality_calm_focus.png"),
  ask_personality_coach: require("../assets/shop/ask/ask_personality_coach.png"),
  ask_personality_encouraging: require("../assets/shop/ask/ask_personality_encouraging.png"),
  ask_personality_playful: require("../assets/shop/ask/ask_personality_playful.png"),
  ask_personality_storyteller: require("../assets/shop/ask/ask_personality_storyteller.png"),
};

// Ask upgrades are active in the current build.
const V1_LOCK_ASK_UPGRADES = false;

export const catalog: CatalogItem[] = [
  // Plushies
  {
    id: "plushie_nova_pajamas",
    title: "Nova Plushie (Pajamas)",
    category: "plushies",
    priceUSD: 60,
    priceCoins: dollarsToCoins(60),
    image: img.plushie_nova_front,
    altImageKey: "plushie_nova_back",
    desc: "Cuddly Nova in cozy pajamas. Flip to see the back!",
  },
  {
    id: "plushie_bunny_classic",
    title: "Bunny Plushie (Classic)",
    category: "plushies",
    priceUSD: 60,
    priceCoins: dollarsToCoins(60),
    image: img.plushie_bunny_front,
    altImageKey: "plushie_bunny_back",
    desc: "The original Nova bunny—classic smile, classic vibes.",
  },
  {
    id: "plushie_bunny_white",
    title: "Bunny Plushie (White)",
    category: "plushies",
    priceUSD: 60,
    priceCoins: dollarsToCoins(60),
    image: img.plushie_bunny_front_white,
    altImageKey: "plushie_bunny_back_white",
    desc: "Clean white edition of the fan-favorite bunny.",
  },
  {
    id: "plushie_star",
    title: "Star Plushie",
    category: "plushies",
    priceUSD: 60,
    priceCoins: dollarsToCoins(60),
    image: img.plushie_star_front,
    altImageKey: "plushie_star_back",
    desc: "A soft star to brighten any desk or bed.",
  },
  {
    id: "plushie_bunny_book",
    title: "Bunny Plushie (Book)",
    category: "plushies",
    priceUSD: 60,
    priceCoins: dollarsToCoins(60),
    image: img.nova_bunny_book_plushie_front,
    altImageKey: "nova_bunny_book_plushie_back",
    desc: "Bunny with a book—your study buddy mascot.",
  },
  {
    id: "plushie_devil",
    title: "Nova Plushie Devil",
    category: "plushies",
    priceUSD: 60,
    priceCoins: dollarsToCoins(60),
    image: img.nova_plushie_devil_front,
    altImageKey: "nova_plushie_devil_back",
    desc: "Mischievous horns, maximum cute.",
  },
  {
    id: "plushie_purple",
    title: "Nova Plushie Purple",
    category: "plushies",
    priceUSD: 60,
    priceCoins: dollarsToCoins(60),
    image: img.nova_plushie_purple_front,
    altImageKey: "nova_plushie_purple_back",
    desc: "Vibrant purple plush with chill energy.",
  },

  // Clothing
  {
    id: "tee_nova_glow",
    title: "Nova Glow Tee",
    category: "clothing",
    priceUSD: 80,
    priceCoins: dollarsToCoins(80),
    image: img.tee_front,
    altImageKey: "tee_front_glow",
    desc: "Premium tee with a luminous Nova crest. Tap to view the glow detail.",
  },
  {
    id: "hoodie_nova",
    title: "Nova Hoodie",
    category: "clothing",
    priceUSD: 120,
    priceCoins: dollarsToCoins(120),
    image: img.hoodie,
    desc: "Heavyweight hoodie—warm, soft, and built for all-nighters.",
  },
  {
    id: "beanie_nova",
    title: "Nova Beanie",
    category: "clothing",
    priceUSD: 45,
    priceCoins: dollarsToCoins(45),
    image: img.beanie,
    desc: "Cozy cuffed beanie with the Nova mark.",
  },
  {
    id: "pajamas",
    title: "Pajamas (Set)",
    category: "clothing",
    priceUSD: 90,
    priceCoins: dollarsToCoins(90),
    image: img.pajamas,
    desc: "Two-piece pajama set for ultra-comfy study sessions.",
  },
  {
    id: "pajama_bottoms",
    title: "Pajama Bottoms",
    category: "clothing",
    priceUSD: 50,
    priceCoins: dollarsToCoins(50),
    image: img.pajama_bottoms,
    desc: "Soft lounge bottoms—pair with your favorite tee.",
  },
  {
    id: "sweat_bottoms",
    title: "Sweat Bottoms",
    category: "clothing",
    priceUSD: 70,
    priceCoins: dollarsToCoins(70),
    image: img.sweat_bottoms,
    desc: "Relaxed fit sweatpants for everyday comfort.",
  },
  {
    id: "hat",
    title: "Hat",
    category: "clothing",
    priceUSD: 60,
    priceCoins: dollarsToCoins(60),
    image: img.hat,
    desc: "Adjustable cap with the Nova emblem.",
  },

  // Tangibles
  {
    id: "keychain_nova",
    title: "Nova Keychain",
    category: "tangibles",
    priceUSD: 30,
    priceCoins: dollarsToCoins(30),
    image: img.keychain,
    desc: "Metal keychain—carry Nova wherever you go.",
  },
  {
    id: "stationery_set",
    title: "Stationery Set",
    category: "tangibles",
    priceUSD: 48,
    priceCoins: dollarsToCoins(48),
    image: img.stationery,
    desc: "Stickers, note cards, and more—desk-ready essentials.",
  },
  {
    id: "phone_case",
    title: "Phone Case",
    category: "tangibles",
    priceUSD: 40,
    priceCoins: dollarsToCoins(40),
    image: img.case,
    desc: "Protective case with a smooth matte Nova finish.",
  },

  // Cursors (IAP)
  {
    id: "cursor_glow",
    title: "Cursor: Glow",
    category: "cursor",
    priceUSD: 3,
    priceCoins: dollarsToCoins(3),
    image: img.glow_cursor,
    desc: "Subtle neon glow for your pointer.",
    meta: {
      iapProductId: "cursor_glow",
      grantId: "cursor_glow",
    },
  },
  {
    id: "cursor_orb",
    title: "Cursor: Orb Glow",
    category: "cursor",
    priceUSD: 3,
    priceCoins: dollarsToCoins(3),
    image: img.orb_cursor,
    desc: "Spherical glow with smooth motion.",
    meta: {
      iapProductId: "cursor_orb",
      grantId: "cursor_orb",
    },
  },
  {
    id: "cursor_star_trail",
    title: "Cursor: Star Trail",
    category: "cursor",
    priceUSD: 3,
    priceCoins: dollarsToCoins(3),
    image: img.star_trail_cursor,
    desc: "A sparkling tail that follows each move.",
    meta: {
      iapProductId: "cursor_star_trail",
      grantId: "cursor_star_trail",
    },
  },

  // Themes (IAP)
  {
    id: "theme_neon",
    title: "Theme: Neon Nova",
    category: "theme",
    themeId: "neon",
    priceUSD: 6,
    priceCoins: dollarsToCoins(6),
    image: img.neon_theme,
    desc: "Bold neon accents on dark—signature Nova.",
    meta: {
      iapProductId: "theme_neon",
      grantId: "theme_neon",
    },
  },
  {
    id: "theme_starry",
    title: "Theme: Starry Night",
    category: "theme",
    themeId: "theme:starry",
    priceUSD: 6,
    priceCoins: dollarsToCoins(6),
    image: img.star_theme,
    desc: "Midnight skies and distant galaxies.",
    meta: {
      iapProductId: "theme_starry",
      grantId: "theme_starry",
    },
  },
  {
    id: "theme_pink",
    title: "Theme: Pink Dawn",
    category: "theme",
    themeId: "pink",
    priceUSD: 6,
    priceCoins: dollarsToCoins(6),
    image: img.pink_theme,
    desc: "Warm pink gradients for a soft glow.",
    meta: {
      iapProductId: "theme_pink",
      grantId: "theme_pink",
    },
  },
  {
    id: "theme_dark",
    title: "Theme: Dark Nova",
    category: "theme",
    themeId: "dark",
    priceUSD: 6,
    priceCoins: dollarsToCoins(6),
    image: img.dark_theme,
    desc: "Ultra-dark minimal—the hacker vibe.",
    meta: {
      iapProductId: "theme_dark",
      grantId: "theme_dark",
    },
  },
  {
    id: "theme_mint",
    title: "Theme: Mint Breeze",
    category: "theme",
    themeId: "mint",
    priceUSD: 6,
    priceCoins: dollarsToCoins(6),
    image: img.mint_theme,
    desc: "Cool mints with breezy contrast.",
    meta: {
      iapProductId: "theme_mint",
      grantId: "theme_mint",
    },
  },
  {
    id: "theme_glitter",
    title: "Theme: Glitter",
    category: "theme",
    themeId: "glitter",
    priceUSD: 6,
    priceCoins: dollarsToCoins(6),
    image: img.glitter_theme,
    desc: "Sparkles everywhere—because you can.",
    meta: {
      iapProductId: "theme_glitter",
      grantId: "theme_glitter",
    },
  },
  {
    id: "theme_black_gold",
    title: "Theme: Black & Gold",
    category: "theme",
    themeId: "theme:blackgold",
    priceUSD: 6,
    priceCoins: dollarsToCoins(6),
    image: img.theme_black_gold,
    desc: "Luxury black with gold trim.",
    meta: {
      iapProductId: "theme_black_gold",
      grantId: "theme_black_gold",
    },
  },
  {
    id: "theme_crimson",
    title: "Theme: Crimson Dream",
    category: "theme",
    themeId: "crimson",
    priceUSD: 6,
    priceCoins: dollarsToCoins(6),
    image: img.theme_crimson_dream,
    desc: "Deep reds with soft highlights.",
    meta: {
      iapProductId: "theme_crimson_dream",
      grantId: "theme_crimson",
    },
  },
  {
    id: "theme_emerald",
    title: "Theme: Emerald Wave",
    category: "theme",
    themeId: "emerald",
    priceUSD: 6,
    priceCoins: dollarsToCoins(6),
    image: img.theme_emerald_wave,
    desc: "Jewel-toned greens that pop.",
    meta: {
      iapProductId: "theme_emerald_wave",
      grantId: "theme_emerald",
    },
  },
  {
    id: "theme_neon_purple",
    title: "Theme: Neon Purple",
    category: "theme",
    themeId: "theme:neonpurple",
    priceUSD: 6,
    priceCoins: dollarsToCoins(6),
    image: img.theme_neon_purple,
    desc: "Electric purples with neon edges.",
    meta: {
      iapProductId: "theme_neon_purple",
      grantId: "theme_neon_purple",
    },
  },
  {
    id: "theme_silver",
    title: "Theme: Silver Frost",
    category: "theme",
    themeId: "silver",
    priceUSD: 6,
    priceCoins: dollarsToCoins(6),
    image: img.theme_silver_frost,
    desc: "Icy chrome with subtle shine.",
    meta: {
      iapProductId: "theme_silver_frost",
      grantId: "theme_silver",
    },
  },

  // Bundle (IAP)
  {
    id: "bundle_neon",
    title: "Neon Starter Bundle",
    category: "bundle",
    priceUSD: 12,
    priceCoins: dollarsToCoins(12),
    image: img.bundle_neon,
    desc: "Neon theme + Orb cursor combo.",
    meta: {
      iapProductId: "bundle_neon",
      bundleGrants: ["theme_neon", "cursor_orb"],
      grantId: "bundle_neon",
    },
  },

  // Ask Memory (IAP)
  {
    id: "ask_memory_tier1",
    title: "Ask Memory: Tier I",
    category: "ask_memory",
    priceUSD: 2,
    image: img.ask_memory_tier1_nova_notes,
    desc: "Nova remembers up to 20 previous messages—great for regular study chats.",
    askMemoryTier: "tier1",
    askMemoryLimit: 20,
    meta: {
      comingSoon: V1_LOCK_ASK_UPGRADES,
      iapProductId: "ask_memory_tier1",
      askMemoryTier: "tier1",
      askMemoryLimit: 20,
      grantId: "ask_memory_tier1",
    },
  },
  {
    id: "ask_memory_tier2",
    title: "Ask Memory: Tier II",
    category: "ask_memory",
    priceUSD: 4,
    image: img.ask_memory_tier2_nova_journal,
    desc: "Nova remembers up to 50 previous messages—perfect for deep dives and projects.",
    askMemoryTier: "tier2",
    askMemoryLimit: 50,
    meta: {
      comingSoon: V1_LOCK_ASK_UPGRADES,
      iapProductId: "ask_memory_tier2",
      askMemoryTier: "tier2",
      askMemoryLimit: 50,
      grantId: "ask_memory_tier2",
    },
  },
  {
    id: "ask_memory_tier3",
    title: "Ask Memory: Tier III",
    category: "ask_memory",
    priceUSD: 6,
    image: img.ask_memory_tier3_nova_vault,
    desc: "Nova remembers up to 100 previous messages for long study sessions.",
    askMemoryTier: "tier3",
    askMemoryLimit: 100,
    meta: {
      comingSoon: V1_LOCK_ASK_UPGRADES,
      iapProductId: "ask_memory_tier3",
      askMemoryTier: "tier3",
      askMemoryLimit: 100,
      grantId: "ask_memory_tier3",
    },
  },
  {
    id: "ask_memory_tier4",
    title: "Ask Memory: Tier IV",
    category: "ask_memory",
    priceUSD: 8,
    image: img.ask_memory_tier4_nova_galaxy_archive,
    desc: "Nova remembers up to 250 previous messages for huge projects and study arcs.",
    askMemoryTier: "tier4",
    askMemoryLimit: 250,
    meta: {
      comingSoon: V1_LOCK_ASK_UPGRADES,
      iapProductId: "ask_memory_tier4",
      askMemoryTier: "tier4",
      askMemoryLimit: 250,
      grantId: "ask_memory_tier4",
    },
  },

  // Nova AI Experiences (IAP)
  {
    id: "ask_personality_calm_focus",
    title: "Nova Experience: Calm Focus",
    category: "ask_personality",
    priceUSD: 2,
    image: img.ask_personality_calm_focus,
    desc: "A quiet, low-distraction tutor with concise steps, no jokes, and one clear next action.",
    askPersonalityKey: "calm_focus",
    meta: {
      comingSoon: V1_LOCK_ASK_UPGRADES,
      iapProductId: "ask_personality_calm_focus",
      personalityId: "calm_focus",
      grantId: "ask_personality_calm_focus",
      experienceTagline: "A quiet study room in your pocket",
      experienceBullets: [
        "No jokes, hype, or clutter",
        "Up to four concise steps",
        "One clear next action",
      ],
      previewQuestion: "Why do objects fall?",
      previewAnswer:
        "FOCUS\nGravity pulls objects toward Earth.\n\nSTEPS\n1. Earth has mass.\n2. Mass creates gravitational attraction.\n3. Nearby objects accelerate toward Earth.\n\nNEXT STEP\nPicture one dropped object and identify the direction of its acceleration.",
      personalityAccent: "#60a5fa",
      personalityIcon: "moon-outline",
    },
  },
  {
    id: "ask_personality_coach",
    title: "Nova Experience: Coach",
    category: "ask_personality",
    priceUSD: 2,
    image: img.ask_personality_coach,
    desc: "A goal-driven tutor with punchy game plans, specific motivation, and a challenge to finish.",
    askPersonalityKey: "coach",
    meta: {
      comingSoon: V1_LOCK_ASK_UPGRADES,
      iapProductId: "ask_personality_coach",
      personalityId: "coach",
      grantId: "ask_personality_coach",
      experienceTagline: "Turn every question into forward motion",
      experienceBullets: [
        "A concrete goal",
        "A punchy game plan",
        "A practical “Your Move”",
      ],
      previewQuestion: "Why do objects fall?",
      previewAnswer:
        "GOAL\nUnderstand gravity well enough to explain it in one sentence.\n\nGAME PLAN\nEarth’s mass creates gravity. That force pulls nearby objects toward Earth, so a dropped object accelerates downward.\n\nYOUR MOVE\nSay it back without using the word “down.” You’ve got this. ⚡",
      personalityAccent: "#fb923c",
      personalityIcon: "flash-outline",
    },
  },
  {
    id: "ask_personality_playful",
    title: "Nova Experience: Playful",
    category: "ask_personality",
    priceUSD: 2,
    image: img.ask_personality_playful,
    desc: "A game-like tutor using silly metaphors, memorable examples, emojis, and quick challenges.",
    askPersonalityKey: "playful",
    meta: {
      comingSoon: V1_LOCK_ASK_UPGRADES,
      iapProductId: "ask_personality_playful",
      personalityId: "playful",
      grantId: "ask_personality_playful",
      experienceTagline: "Learning with games and weird examples",
      experienceBullets: [
        "Funny, relevant metaphors",
        "Game-like explanations",
        "A playful quick challenge",
      ],
      previewQuestion: "Why do objects fall?",
      previewAnswer:
        "THE FUN VERSION\nEarth is a giant cosmic magnet for anything with mass—except it uses gravity instead of magnetism. Drop a sandwich, and Earth says, “Mine now.” 🥪🌍\n\nWHAT IT REALLY MEANS\nEarth’s mass creates a gravitational force that accelerates objects toward its center.\n\nQUICK CHALLENGE\nWhich falls because of gravity: a bowling ball, a feather, or both?",
      personalityAccent: "#f472b6",
      personalityIcon: "game-controller-outline",
    },
  },
  {
    id: "ask_personality_storyteller",
    title: "Nova Experience: Storyteller",
    category: "ask_personality",
    priceUSD: 2,
    image: img.ask_personality_storyteller,
    desc: "A narrative tutor that builds vivid scenes, decodes every metaphor, and ends with the plain answer.",
    askPersonalityKey: "storyteller",
    meta: {
      comingSoon: V1_LOCK_ASK_UPGRADES,
      iapProductId: "ask_personality_storyteller",
      personalityId: "storyteller",
      grantId: "ask_personality_storyteller",
      experienceTagline: "Learn it as a world you can picture",
      experienceBullets: [
        "A vivid mini-story",
        "Story-to-concept mapping",
        "A plain-language takeaway",
      ],
      previewQuestion: "Why do objects fall?",
      previewAnswer:
        "THE STORY\nImagine Earth as a queen whose invisible invitation reaches every object nearby. The closer they are, the more strongly they are drawn toward her castle at the center.\n\nWHAT THE STORY REPRESENTS\nThe queen is Earth’s mass, the invitation is gravity, and the castle is Earth’s center.\n\nTHE TAKEAWAY\nObjects fall because Earth’s gravity accelerates them toward its center.",
      personalityAccent: "#a78bfa",
      personalityIcon: "book-outline",
    },
  },

  // Coin Packs (IAP)
  {
    id: "pack_1k",
    title: "1,000 coins",
    category: "coin_pack",
    priceUSD: 1,
    image: img.coins_1000,
    desc: "Quick top-up for small unlocks.",
    meta: {
      iapProductId: "coins_1000",
      coinAmount: 1000,
      grantId: "pack_1k",
    },
  },
  {
    id: "pack_5k",
    title: "5,000 coins",
    category: "coin_pack",
    priceUSD: 5,
    image: img.coins_5000,
    desc: "Best for a few premium items.",
    meta: {
      iapProductId: "coins_5000",
      coinAmount: 5000,
      grantId: "pack_5k",
    },
  },
];

export const altImages: Record<string, any> = {
  plushie_nova_back: img.plushie_nova_back,
  plushie_bunny_back: img.plushie_bunny_back,
  plushie_bunny_back_white: img.plushie_bunny_back_white,
  plushie_star_back: img.plushie_star_back,
  nova_bunny_book_plushie_back: img.nova_bunny_book_plushie_back,
  nova_plushie_devil_back: img.nova_plushie_devil_back,
  nova_plushie_purple_back: img.nova_plushie_purple_back,
  tee_front_glow: img.tee_front_glow,
};