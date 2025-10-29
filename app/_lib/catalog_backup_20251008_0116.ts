export const COINS_PER_DOLLAR = 1000;
export const dollarsToCoins = (usd: number) => Math.round(usd * COINS_PER_DOLLAR);

export type Category =
  | "plushies"
  | "clothing"
  | "tangibles"
  | "cursor"
  | "theme"
  | "bundle"
  | "coin_pack";

export const CATEGORY_BORDER: Record<Category, string> = {
  plushies: "#00e5ff",
  clothing: "#FFD700",
  tangibles: "#14b8a6",
  cursor: "#22c55e",
  theme: "#b67cff",
  bundle: "#f97316",
  coin_pack: "#f59e0b",
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
};

// ✅ static image imports — all plushie fronts/backs included
const img = {
  // Plushies
  plushie_nova_front: require("../assets/shop/plushie_nova_pajamas_front.png"),
  plushie_nova_back: require("../assets/shop/plushie_nova_pajamas_back.png"),
  plushie_bunny_front: require("../assets/shop/plushie_bunny_front.png"),
  plushie_bunny_back: require("../assets/shop/plushie_bunny_back.png"),
  plushie_bunny_front_white: require("../assets/shop/plushie_bunny_front_white.png"),
  plushie_bunny_back_white: require("../assets/shop/plushie_bunny_back_white.png"),
  plushie_star_front: require("../assets/shop/plushie_star_front.png"),
  plushie_star_back: require("../assets/shop/plushie_star_back.png"),
  nova_bunny_book_plushie_front: require("../assets/shop/nova_bunny_book_plushie_front.png"),
  nova_bunny_book_plushie_back: require("../assets/shop/nova_bunny_book_plushie_back.png"),
  nova_plushie_devil_front: require("../assets/shop/nova_plushie_devil_front.png"),
  nova_plushie_devil_back: require("../assets/shop/nova_plushie_devil_back.png"),
  nova_plushie_purple_front: require("../assets/shop/nova_plushie_purple_front.png"),
  nova_plushie_purple_back: require("../assets/shop/nova_plushie_purple_back.png"),

  // Clothing
  beanie: require("../assets/shop/beanie.png"),
  hoodie: require("../assets/shop/hoodie.png"),
  tee_front: require("../assets/shop/tee_front.png"),
  tee_front_glow: require("../assets/shop/tee_front_glow.png"),
  pajamas: require("../assets/shop/pajamas.png"),
  pajama_bottoms: require("../assets/shop/pajama_bottoms.png"),
  sweat_bottoms: require("../assets/shop/sweat_bottoms.png"),
  hat: require("../assets/shop/hat.png"),

  // Tangibles
  keychain: require("../assets/shop/keychain.png"),
  stationery: require("../assets/shop/stationery.png"),
  case: require("../assets/shop/case.png"),

  // Cursors
  glow_cursor: require("../assets/shop/glow_cursor.png"),
  orb_cursor: require("../assets/shop/orb_cursor.png"),
  star_trail_cursor: require("../assets/shop/star_trail_cursor.png"),

  // Themes
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

  // Bundles / Coins
  bundle_neon: require("../assets/shop/bundle_neon.png"),
  coins_1000: require("../assets/shop/coins_1000.png"),
  coins_5000: require("../assets/shop/coins_5000.png"),
};

// ✅ SHOP CATALOG
export const catalog: CatalogItem[] = [
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
];

// ✅ ALT IMAGES
export const altImages: Record<string, any> = {
  plushie_nova_back: img.plushie_nova_back,
  plushie_bunny_back: img.plushie_bunny_back,
  plushie_bunny_back_white: img.plushie_bunny_back_white,
  plushie_star_back: img.plushie_star_back,
  nova_bunny_book_plushie_back: img.nova_bunny_book_plushie_back,
  nova_plushie_devil_back: img.nova_plushie_devil_back,
  nova_plushie_purple_back: img.nova_plushie_purple_back,
};