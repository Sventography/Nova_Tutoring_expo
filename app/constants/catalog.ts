import { SHOP_IMAGES, ShopImageKey } from "./shop_images";
import { COINS_PER_DOLLAR } from "./config";

export type CatalogKind = "coins" | "tangible" | "theme" | "cursor" | "avatar";
export type CatalogItem = {
  id: string;
  title: string;
  description?: string;
  kind: CatalogKind;
  imageKey: ShopImageKey;
  altImageKey?: ShopImageKey;
  priceUsd?: number;
  priceCoins?: number;
};

const PRICE_MULTIPLIER = 2;

function withDualPrice<T extends CatalogItem>(it: T): T {
  let { priceUsd, priceCoins } = it;
  if (priceUsd == null && priceCoins != null) priceUsd = priceCoins / COINS_PER_DOLLAR;
  if (priceCoins == null && priceUsd != null) priceCoins = Math.round(priceUsd * COINS_PER_DOLLAR);
  return {
    ...it,
    priceUsd: typeof priceUsd === "number" ? +(priceUsd * PRICE_MULTIPLIER).toFixed(2) : undefined,
    priceCoins: typeof priceCoins === "number" ? Math.round(priceCoins * PRICE_MULTIPLIER) : undefined,
  };
}

function withCashOnly<T extends CatalogItem>(it: T): T {
  const priceUsd = typeof it.priceUsd === "number" ? +(it.priceUsd * PRICE_MULTIPLIER).toFixed(2) : undefined;
  return { ...it, priceUsd, priceCoins: undefined };
}

// ---- Coins (cash-only) ----
export const COIN_PACKS = [
  withCashOnly({ id: "coins_1000", title: "Coins 1000", description: "Get 1,000 coins instantly.", kind: "coins", imageKey: "coins_1000", priceUsd: 1.0 }),
  withCashOnly({ id: "coins_5000", title: "Coins 5000", description: "Get 5,000 coins instantly.", kind: "coins", imageKey: "coins_5000", priceUsd: 5.0 }),
];

// ---- Tangibles ----
export const TANGIBLES = [
  withDualPrice({ id: "plushie_star",  title: "Nova Plushie (Star)", description: "Soft plushie with a shooting star design.", kind: "tangible", imageKey: "plushie_star",  priceUsd: 60 }),
  withDualPrice({ id: "keychain",      title: "Keychain",            description: "Carry Nova with you anywhere.", kind: "tangible", imageKey: "keychain",      priceUsd: 15 }),
  withDualPrice({
    id: "tee_glow", title: "Tee", description: "Glow in the dark tee-shirt.",
    kind: "tangible", imageKey: "tee_front", altImageKey: "tee_front_glow", priceUsd: 60,
  }),
  withDualPrice({ id: "beanie",        title: "Beanie",              description: "Warm knit beanie for chilly days.", kind: "tangible", imageKey: "beanie",        priceUsd: 45 }),
  withDualPrice({ id: "hoodie",        title: "Hoodie",              description: "Cozy hoodie with Nova flair.", kind: "tangible", imageKey: "hoodie",        priceUsd: 120 }),
  withDualPrice({ id: "stationery",    title: "Stationery Set",      description: "Nova-themed paper and pens.", kind: "tangible", imageKey: "stationery",    priceUsd: 24 }),
  withDualPrice({ id: "case",          title: "Phone Case",          description: "Protective phone case with style.", kind: "tangible", imageKey: "case",          priceUsd: 30 }),
  withDualPrice({ id: "hat",           title: "Cap / Hat",           description: "Casual cap with embroidered Nova.", kind: "tangible", imageKey: "hat",           priceUsd: 28 }),
  withDualPrice({ id: "sweat_bottoms", title: "Sweat Bottoms",       description: "Comfy sweatpants for relaxing days.", kind: "tangible", imageKey: "sweat_bottoms", priceUsd: 55 }),
];

// ---- Themes ----
export const THEMES = [
  withDualPrice({ id: "star_theme",          title: "Star Theme",        description: "A theme filled with glowing stars.", kind: "theme",  imageKey: "star_theme",          priceCoins: 5000 }),
  withDualPrice({ id: "neon_theme",          title: "Neon Rain Theme",   description: "Bright neon streaks light your screen.", kind: "theme",  imageKey: "neon_theme",          priceCoins: 6000 }),
  withDualPrice({ id: "mint_theme",          title: "Mint Theme",        description: "Cool green tones for focus and calm.", kind: "theme",  imageKey: "mint_theme",          priceCoins: 4000 }),
  withDualPrice({ id: "dark_theme",          title: "Dark Theme",        description: "Minimal dark mode for night use.", kind: "theme",  imageKey: "dark_theme",          priceCoins: 4000 }),
  withDualPrice({ id: "pink_theme",          title: "Pink Theme",        description: "Soft pink tones for a cozy mood.", kind: "theme",  imageKey: "pink_theme",          priceCoins: 4000 }),
  withDualPrice({ id: "theme_black_gold",    title: "Black & Gold",      description: "Elegant black with gold accents.", kind: "theme",  imageKey: "theme_black_gold",    priceCoins: 7000 }),
  withDualPrice({ id: "theme_crimson_dream", title: "Crimson Dream",     description: "Deep reds and dreamy hues.", kind: "theme",  imageKey: "theme_crimson_dream", priceCoins: 7000 }),
  withDualPrice({ id: "theme_emerald_wave",  title: "Emerald Wave",      description: "Rolling emerald gradients.", kind: "theme",  imageKey: "theme_emerald_wave",  priceCoins: 7000 }),
  withDualPrice({ id: "theme_neon_purple",   title: "Neon Purple",       description: "Bright neon purples glow strong.", kind: "theme",  imageKey: "theme_neon_purple",   priceCoins: 7000 }),
  withDualPrice({ id: "theme_silver_frost",  title: "Silver Frost",      description: "Icy silver shades with frosted edges.", kind: "theme",  imageKey: "theme_silver_frost",  priceCoins: 7000 }),
  withDualPrice({ id: "bundle_neon",         title: "Neon Bundle",       description: "A full set of glowing neon themes.", kind: "theme",  imageKey: "bundle_neon",         priceCoins: 9000 }),
  withDualPrice({ id: "glitter_theme",       title: "Glitter Theme",     description: "Sparkling lights that shimmer.", kind: "theme",  imageKey: "glitter_theme",       priceCoins: 5000 }),
];

// ---- Cursors ----
export const CURSORS = [
  withDualPrice({ id: "glow_cursor",       title: "Glow Cursor",       description: "A pointer that shines brightly.", kind: "cursor", imageKey: "glow_cursor",       priceCoins: 2500 }),
  withDualPrice({ id: "orb_cursor",        title: "Orb Cursor",        description: "A glowing orb follows your clicks.", kind: "cursor", imageKey: "orb_cursor",        priceCoins: 2500 }),
  withDualPrice({ id: "star_trail_cursor", title: "Star Trail Cursor", description: "Leave a trail of stars behind.",   kind: "cursor", imageKey: "star_trail_cursor", priceCoins: 3000 }),
];

// ---- Avatars & Plushies ----
export const AVATARS = [
  withDualPrice({ id: "avatar_nova",             title: "Avatar: Nova",         description: "Classic Nova avatar.", kind: "avatar", imageKey: "avatar_nova",               priceCoins: 2000 }),
  withDualPrice({ id: "nova_bunny_book_plushie", title: "Bunny Plushie (Book)", description: "Nova bunny reading a book.", kind: "avatar", imageKey: "nova_bunny_book_plushie",   priceCoins: 2500 }),
  withDualPrice({ id: "nova_bunny_front",        title: "Bunny Plushie (Front)",description: "Front view of Nova bunny plushie.", kind: "avatar", imageKey: "nova_bunny_front",          priceCoins: 2500 }),
  withDualPrice({ id: "nova_plushie_devil",      title: "Devil Plushie",        description: "Playful devil-style plushie.", kind: "avatar", imageKey: "nova_plushie_devil",        priceCoins: 2500 }),
  withDualPrice({ id: "nova_plushie_purple",     title: "Purple Plushie",       description: "Purple-themed Nova plushie.", kind: "avatar", imageKey: "nova_plushie_purple",       priceCoins: 2500 }),
  withDualPrice({ id: "plushie_bunny_white",     title: "Bunny (White)",        description: "White bunny plushie, front & back.", kind: "avatar", imageKey: "plushie_bunny_front_white", altImageKey: "plushie_bunny_back_white", priceCoins: 2000 }),
  withDualPrice({ id: "plushie_bunny",           title: "Bunny",                description: "Classic bunny plushie, front & back.", kind: "avatar", imageKey: "plushie_bunny_front", altImageKey: "plushie_bunny_back", priceCoins: 2000 }),
  withDualPrice({ id: "plushie_nova_pjs",        title: "Nova PJs",             description: "Nova plushie in cozy pajamas.", kind: "avatar", imageKey: "plushie_nova_pajamas_front",altImageKey: "plushie_nova_pajamas_back", priceCoins: 2200 }),
  withDualPrice({ id: "pajama_bottoms",          title: "Pajama Bottoms",       description: "Soft pajama pants for bedtime.", kind: "avatar", imageKey: "pajama_bottoms",            priceCoins: 2000 }),
  withDualPrice({ id: "pajamas",                 title: "Pajamas",              description: "Full pajama outfit plushie.", kind: "avatar", imageKey: "pajamas",                   priceCoins: 2000 }),
];

export const CATALOG_BY_SECTION = {
  coins: COIN_PACKS,
  tangibles: TANGIBLES,
  themes: THEMES,
  cursors: CURSORS,
  avatars: AVATARS,
} as const;
