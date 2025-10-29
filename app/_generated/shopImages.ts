/* AUTO-GENERATED — UPDATED FOR NEW PLUSHIE BACKS
   Run: npm run gen:shop  (or: node scripts/gen-shop-manifest.mjs)
*/
export const SHOP_IMAGES = {
  "avatar_nova": require("../assets/shop/avatar_nova.png"),
  "beanie": require("../assets/shop/beanie.png"),
  "bundle_neon": require("../assets/shop/bundle_neon.png"),
  "case": require("../assets/shop/case.png"),
  "coins_1000": require("../assets/shop/coins_1000.png"),
  "coins_5000": require("../assets/shop/coins_5000.png"),
  "dark_theme": require("../assets/shop/dark_theme.png"),
  "glitter_theme": require("../assets/shop/glitter_theme.png"),
  "glow_cursor": require("../assets/shop/glow_cursor.png"),
  "hat": require("../assets/shop/hat.png"),
  "hoodie": require("../assets/shop/hoodie.png"),
  "keychain": require("../assets/shop/keychain.png"),
  "mint_theme": require("../assets/shop/mint_theme.png"),
  "neon_theme": require("../assets/shop/neon_theme.png"),

  // plushies (front/back)
  "nova_bunny_book_plushie_front": require("../assets/shop/nova_bunny_book_plushie_front.png"),
  "nova_bunny_book_plushie_back":  require("../assets/shop/nova_bunny_book_plushie_back.png"),
  "plushie_star_front": require("../assets/shop/plushie_star_front.png"),
  "plushie_star_back":  require("../assets/shop/plushie_star_back.png"),
  "plushie_bunny_front": require("../assets/shop/plushie_bunny_front.png"),
  "plushie_bunny_back":  require("../assets/shop/plushie_bunny_back.png"),
  "plushie_bunny_front_white": require("../assets/shop/plushie_bunny_front_white.png"),
  "plushie_bunny_back_white":  require("../assets/shop/plushie_bunny_back_white.png"),
  "plushie_nova_pajamas_front": require("../assets/shop/plushie_nova_pajamas_front.png"),
  "plushie_nova_pajamas_back":  require("../assets/shop/plushie_nova_pajamas_back.png"),
  "nova_plushie_devil_front":   require("../assets/shop/nova_plushie_devil_front.png"),
  "nova_plushie_devil_back":    require("../assets/shop/nova_plushie_devil_back.png"),
  "nova_plushie_purple_front":  require("../assets/shop/nova_plushie_purple_front.png"),
  "nova_plushie_purple_back":   require("../assets/shop/nova_plushie_purple_back.png"),

  "orb_cursor": require("../assets/shop/orb_cursor.png"),
  "pajama_bottoms": require("../assets/shop/pajama_bottoms.png"),
  "pajamas": require("../assets/shop/pajamas.png"),
  "pink_theme": require("../assets/shop/pink_theme.png"),
  "star_theme": require("../assets/shop/star_theme.png"),
  "star_trail_cursor": require("../assets/shop/star_trail_cursor.png"),
  "stationery": require("../assets/shop/stationery.png"),
  "sweat_bottoms": require("../assets/shop/sweat_bottoms.png"),
  "theme_black_gold": require("../assets/shop/theme_black_gold.png"),
  "theme_crimson_dream": require("../assets/shop/theme_crimson_dream.png"),
  "theme_emerald_wave": require("../assets/shop/theme_emerald_wave.png"),
  "theme_neon_purple": require("../assets/shop/theme_neon_purple.png"),
  "theme_silver_frost": require("../assets/shop/theme_silver_frost.png"),
} as const;

export type ShopImageKey = keyof typeof SHOP_IMAGES;

export const SHOP_PAIRS: Record<string, { front?: ShopImageKey; back?: ShopImageKey }> = {
  // Plushies
  "plushie_nova_pajamas": {
    front: "plushie_nova_pajamas_front",
    back: "plushie_nova_pajamas_back",
  },
  "plushie_bunny_classic": {
    front: "plushie_bunny_front",
    back: "plushie_bunny_back",
  },
  "plushie_bunny_white": {
    front: "plushie_bunny_front_white",
    back: "plushie_bunny_back_white",
  },
  "plushie_star": {
    front: "plushie_star_front",
    back: "plushie_star_back",
  },
  "plushie_bunny_book": {
    front: "nova_bunny_book_plushie_front",
    back: "nova_bunny_book_plushie_back",
  },
  "plushie_devil": {
    front: "nova_plushie_devil_front",
    back: "nova_plushie_devil_back",
  },
  "plushie_purple": {
    front: "nova_plushie_purple_front",
    back: "nova_plushie_purple_back",
  },

  // Other (no flip)
  "hoodie": {},
  "tee": {},
  "hat": {},
  "beanie": {},
  "pajamas": {},
  "pajama_bottoms": {},
  "sweat_bottoms": {},
  "keychain": {},
  "case": {},
  "stationery": {},
  "bundle_neon": {},
  "coins_1000": {},
  "coins_5000": {},
  "orb_cursor": {},
  "glow_cursor": {},
  "star_trail_cursor": {},
  "theme_black_gold": {},
  "theme_crimson_dream": {},
  "theme_emerald_wave": {},
  "theme_neon_purple": {},
  "theme_silver_frost": {},
  "dark_theme": {},
  "neon_theme": {},
  "mint_theme": {},
  "pink_theme": {},
  "star_theme": {},
  "glitter_theme": {},
};