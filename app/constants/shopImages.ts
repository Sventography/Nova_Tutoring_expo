/**
 * Central, static require() map for ALL shop images.
 * Never build dynamic paths at runtime—Metro needs static strings.
 */
export const IMAGES = {
  // Plushies (front/back where available)
  nova_plushie_purple_front: require("../assets/shop/nova_plushie_purple_front.png"),
  nova_plushie_purple_back:  require("../assets/shop/nova_plushie_purple_back.png"),
  nova_plushie_devil_front:  require("../assets/shop/nova_plushie_devil_front.png"),
  nova_plushie_devil_back:   require("../assets/shop/nova_plushie_devil_back.png"),
  nova_bunny_book_plushie_front: require("../assets/shop/nova_bunny_book_plushie_front.png"),
  nova_bunny_book_plushie_back:  require("../assets/shop/nova_bunny_book_plushie_back.png"),

  plushie_nova_pajamas_front: require("../assets/shop/plushie_nova_pajamas_front.png"),
  plushie_nova_pajamas_back:  require("../assets/shop/plushie_nova_pajamas_back.png"),
  plushie_bunny_front:        require("../assets/shop/plushie_bunny_front.png"),
  plushie_bunny_back:         require("../assets/shop/plushie_bunny_back.png"),
  plushie_bunny_front_white:  require("../assets/shop/plushie_bunny_front_white.png"),
  plushie_bunny_back_white:   require("../assets/shop/plushie_bunny_back_white.png"),

  // Star plushie (front/back)
  plushie_star_front: require("../assets/shop/plushie_star_front.png"),
  plushie_star_back:  require("../assets/shop/plushie_star_back.png"),
  // Legacy alias
  plushie_star:       require("../assets/shop/plushie_star_front.png"),

  nova_bunny_front:   require("../assets/shop/nova_bunny_front.png"),

  // Apparel
  beanie:          require("../assets/shop/beanie.png"),
  hat:             require("../assets/shop/hat.png"),
  hoodie:          require("../assets/shop/hoodie.png"),
  sweat_bottoms:   require("../assets/shop/sweat_bottoms.png"),
  pajamas:         require("../assets/shop/pajamas.png"),
  pajama_bottoms:  require("../assets/shop/pajama_bottoms.png"),

  // Themes
  star_theme:          require("../assets/shop/star_theme.png"),
  dark_theme:          require("../assets/shop/dark_theme.png"),
  glitter_theme:       require("../assets/shop/glitter_theme.png"),
  mint_theme:          require("../assets/shop/mint_theme.png"),
  neon_theme:          require("../assets/shop/neon_theme.png"),
  pink_theme:          require("../assets/shop/pink_theme.png"),
  theme_black_gold:    require("../assets/shop/theme_black_gold.png"),
  theme_crimson_dream: require("../assets/shop/theme_crimson_dream.png"),
  theme_emerald_wave:  require("../assets/shop/theme_emerald_wave.png"),
  theme_neon_purple:   require("../assets/shop/theme_neon_purple.png"),
  theme_silver_frost:  require("../assets/shop/theme_silver_frost.png"),

  // Virtual items
  avatar_nova:       require("../assets/shop/avatar_nova.png"),
  keychain:          require("../assets/shop/keychain.png"),
  case:              require("../assets/shop/case.png"),
  stationery:        require("../assets/shop/stationery.png"),
  orb_cursor:        require("../assets/shop/orb_cursor.png"),
  glow_cursor:       require("../assets/shop/glow_cursor.png"),
  star_trail_cursor: require("../assets/shop/star_trail_cursor.png"),

  // Bundles & coins
  bundle_neon: require("../assets/shop/bundle_neon.png"),
  coins_1000:  require("../assets/shop/coins_1000.png"),
  coins_5000:  require("../assets/shop/coins_5000.png"),
} as const;