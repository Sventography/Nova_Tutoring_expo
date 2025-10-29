/* AUTO-GENERATED — DO NOT EDIT
   Run: npm run gen:shop  (or: node scripts/gen-shop-manifest.mjs)
*/
export type ShopImageKey =
  | "avatar_nova"
  | "beanie"
  | "bundle_neon"
  | "case"
  | "coins_1000"
  | "coins_5000"
  | "dark_theme"
  | "glitter_theme"
  | "glow_cursor"
  | "hat"
  | "hoodie"
  | "keychain"
  | "mint_theme"
  | "neon_theme"
  | "nova_bunny_book_plushie_front"
  | "nova_bunny_book_plushie_back"
  | "nova_bunny_front"
  | "nova_plushie_devil_front"
  | "nova_plushie_devil_back"
  | "nova_plushie_purple_front"
  | "nova_plushie_purple_back"
  | "orb_cursor"
  | "pajama_bottoms"
  | "pajamas"
  | "pink_theme"
  | "plushie_bunny_back_white"
  | "plushie_bunny_back"
  | "plushie_bunny_front_white"
  | "plushie_bunny_front"
  | "plushie_nova_pajamas_back"
  | "plushie_nova_pajamas_front"
  | "plushie_star_back"
  | "plushie_star_front"
  | "star_theme"
  | "star_trail_cursor"
  | "stationery"
  | "sweat_bottoms"
  | "tee_front_glow"
  | "tee_front"
  | "theme_black_gold"
  | "theme_crimson_dream"
  | "theme_emerald_wave"
  | "theme_neon_purple"
  | "theme_silver_frost";

export const SHOP_IMAGES: Record<ShopImageKey, any> = {
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

  // Plushies (front/back)
  "nova_bunny_book_plushie_front": require("../assets/shop/nova_bunny_book_plushie_front.png"),
  "nova_bunny_book_plushie_back":  require("../assets/shop/nova_bunny_book_plushie_back.png"),
  "nova_bunny_front": require("../assets/shop/nova_bunny_front.png"),
  "nova_plushie_devil_front":  require("../assets/shop/nova_plushie_devil_front.png"),
  "nova_plushie_devil_back":   require("../assets/shop/nova_plushie_devil_back.png"),
  "nova_plushie_purple_front": require("../assets/shop/nova_plushie_purple_front.png"),
  "nova_plushie_purple_back":  require("../assets/shop/nova_plushie_purple_back.png"),
  "plushie_bunny_back_white": require("../assets/shop/plushie_bunny_back_white.png"),
  "plushie_bunny_back": require("../assets/shop/plushie_bunny_back.png"),
  "plushie_bunny_front_white": require("../assets/shop/plushie_bunny_front_white.png"),
  "plushie_bunny_front": require("../assets/shop/plushie_bunny_front.png"),
  "plushie_nova_pajamas_back": require("../assets/shop/plushie_nova_pajamas_back.png"),
  "plushie_nova_pajamas_front": require("../assets/shop/plushie_nova_pajamas_front.png"),
  "plushie_star_back": require("../assets/shop/plushie_star_back.png"),
  "plushie_star_front": require("../assets/shop/plushie_star_front.png"),

  // Misc
  "orb_cursor": require("../assets/shop/orb_cursor.png"),
  "pajama_bottoms": require("../assets/shop/pajama_bottoms.png"),
  "pajamas": require("../assets/shop/pajamas.png"),
  "pink_theme": require("../assets/shop/pink_theme.png"),
  "star_theme": require("../assets/shop/star_theme.png"),
  "star_trail_cursor": require("../assets/shop/star_trail_cursor.png"),
  "stationery": require("../assets/shop/stationery.png"),
  "sweat_bottoms": require("../assets/shop/sweat_bottoms.png"),
  "tee_front_glow": require("../assets/shop/tee_front_glow.png"),
  "tee_front": require("../assets/shop/tee_front.png"),
  "theme_black_gold": require("../assets/shop/theme_black_gold.png"),
  "theme_crimson_dream": require("../assets/shop/theme_crimson_dream.png"),
  "theme_emerald_wave": require("../assets/shop/theme_emerald_wave.png"),
  "theme_neon_purple": require("../assets/shop/theme_neon_purple.png"),
  "theme_silver_frost": require("../assets/shop/theme_silver_frost.png"),

  // Legacy alias (keep if older code references it)
  "plushie_star": require("../assets/shop/plushie_star_front.png"),
} as const;

export const SHOP_PAIRS: Record<string, { front?: ShopImageKey; back?: ShopImageKey }> = {
  // Plushies with flips
  "plushie_nova_pajamas": { front: "plushie_nova_pajamas_front", back: "plushie_nova_pajamas_back" },
  "plushie_bunny":        { front: "plushie_bunny_front",        back: "plushie_bunny_back" },
  "plushie_bunny_white":  { front: "plushie_bunny_front_white",  back: "plushie_bunny_back_white" },
  "plushie_star":         { front: "plushie_star_front",         back: "plushie_star_back" },
  "plushie_bunny_book":   { front: "nova_bunny_book_plushie_front", back: "nova_bunny_book_plushie_back" },
  "plushie_devil":        { front: "nova_plushie_devil_front",   back: "nova_plushie_devil_back" },
  "plushie_purple":       { front: "nova_plushie_purple_front",  back: "nova_plushie_purple_back" },

  // Singles (no flip)
  "nova_bunny": { front: "nova_bunny_front", back: undefined },
  "tee": { front: "tee_front", back: undefined },
};

// Convenience re-exports
export type { ShopImageKey as ImgKey };
// End of generated file.