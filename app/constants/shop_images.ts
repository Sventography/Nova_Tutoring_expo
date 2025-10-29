export type ShopImageKey =
  | "coins_1000" | "coins_5000"
  // ⭐ keep legacy alias + add new front/back keys
  | "plushie_star" | "plushie_star_front" | "plushie_star_back"
  | "keychain" | "tee_front" | "tee_front_glow"
  | "beanie" | "hoodie" | "stationery" | "case" | "hat" | "sweat_bottoms"
  | "star_theme" | "neon_theme" | "mint_theme" | "dark_theme" | "pink_theme"
  | "theme_black_gold" | "theme_crimson_dream" | "theme_emerald_wave"
  | "theme_neon_purple" | "theme_silver_frost" | "bundle_neon" | "glitter_theme"
  | "glow_cursor" | "orb_cursor" | "star_trail_cursor"
  | "avatar_nova" | "nova_bunny_front"
  // 🐰 Bunny (Book) front/back + legacy
  | "nova_bunny_book_plushie_front" | "nova_bunny_book_plushie_back" | "nova_bunny_book_plushie"
  // 😈 Devil front/back + legacy
  | "nova_plushie_devil_front" | "nova_plushie_devil_back" | "nova_plushie_devil"
  // 💜 Purple front/back + legacy
  | "nova_plushie_purple_front" | "nova_plushie_purple_back" | "nova_plushie_purple"
  | "plushie_bunny_front_white" | "plushie_bunny_back_white"
  | "plushie_bunny_front" | "plushie_bunny_back"
  | "plushie_nova_pajamas_front" | "plushie_nova_pajamas_back"
  | "pajama_bottoms" | "pajamas";

export const SHOP_IMAGES: Record<ShopImageKey, any> = {
  // Coins
  coins_1000: require("../assets/shop/coins_1000.png"),
  coins_5000: require("../assets/shop/coins_5000.png"),

  // ⭐ Star plushie (legacy + explicit front/back)
  plushie_star:       require("../assets/shop/plushie_star_front.png"),
  plushie_star_front: require("../assets/shop/plushie_star_front.png"),
  plushie_star_back:  require("../assets/shop/plushie_star_back.png"),

  // Tangibles
  keychain: require("../assets/shop/keychain.png"),
  tee_front: require("../assets/shop/tee_front.png"),
  tee_front_glow: require("../assets/shop/tee_front_glow.png"),
  beanie: require("../assets/shop/beanie.png"),
  hoodie: require("../assets/shop/hoodie.png"),
  stationery: require("../assets/shop/stationery.png"),
  case: require("../assets/shop/case.png"),
  hat: require("../assets/shop/hat.png"),
  sweat_bottoms: require("../assets/shop/sweat_bottoms.png"),

  // Themes
  star_theme: require("../assets/shop/star_theme.png"),
  neon_theme: require("../assets/shop/neon_theme.png"),
  mint_theme: require("../assets/shop/mint_theme.png"),
  dark_theme: require("../assets/shop/dark_theme.png"),
  pink_theme: require("../assets/shop/pink_theme.png"),
  theme_black_gold: require("../assets/shop/theme_black_gold.png"),
  theme_crimson_dream: require("../assets/shop/theme_crimson_dream.png"),
  theme_emerald_wave: require("../assets/shop/theme_emerald_wave.png"),
  theme_neon_purple: require("../assets/shop/theme_neon_purple.png"),
  theme_silver_frost: require("../assets/shop/theme_silver_frost.png"),
  bundle_neon: require("../assets/shop/bundle_neon.png"),
  glitter_theme: require("../assets/shop/glitter_theme.png"),

  // Cursors
  glow_cursor: require("../assets/shop/glow_cursor.png"),
  orb_cursor: require("../assets/shop/orb_cursor.png"),
  star_trail_cursor: require("../assets/shop/star_trail_cursor.png"),

  // Avatars & Plushies (singles)
  avatar_nova: require("../assets/shop/avatar_nova.png"),
  nova_bunny_front: require("../assets/shop/nova_bunny_front.png"),

  // 🐰 Bunny (Book) — new front/back + legacy alias
  nova_bunny_book_plushie_front: require("../assets/shop/nova_bunny_book_plushie_front.png"),
  nova_bunny_book_plushie_back:  require("../assets/shop/nova_bunny_book_plushie_back.png"),
  nova_bunny_book_plushie:       require("../assets/shop/nova_bunny_book_plushie_front.png"),

  // 😈 Devil — new front/back + legacy alias
  nova_plushie_devil_front: require("../assets/shop/nova_plushie_devil_front.png"),
  nova_plushie_devil_back:  require("../assets/shop/nova_plushie_devil_back.png"),
  nova_plushie_devil:       require("../assets/shop/nova_plushie_devil_front.png"),

  // 💜 Purple — new front/back + legacy alias
  nova_plushie_purple_front: require("../assets/shop/nova_plushie_purple_front.png"),
  nova_plushie_purple_back:  require("../assets/shop/nova_plushie_purple_back.png"),
  nova_plushie_purple:       require("../assets/shop/nova_plushie_purple_front.png"),

  // Other plushies
  plushie_bunny_front_white: require("../assets/shop/plushie_bunny_front_white.png"),
  plushie_bunny_back_white: require("../assets/shop/plushie_bunny_back_white.png"),
  plushie_bunny_front: require("../assets/shop/plushie_bunny_front.png"),
  plushie_bunny_back: require("../assets/shop/plushie_bunny_back.png"),
  plushie_nova_pajamas_front: require("../assets/shop/plushie_nova_pajamas_front.png"),
  plushie_nova_pajamas_back: require("../assets/shop/plushie_nova_pajamas_back.png"),

  // Apparel (prices section items)
  pajama_bottoms: require("../assets/shop/pajama_bottoms.png"),
  pajamas: require("../assets/shop/pajamas.png"),
};