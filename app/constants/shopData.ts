import { IMAGES } from "./shopImages";

export type Category = "plushies"|"apparel"|"themes"|"virtual"|"coins";
export type TShopItem = {
  id: string;
  name: string;
  description: string;
  price: number;    // USD cents (for Stripe etc.)
  coins: number;    // in-app currency
  category: Category;
  imageKey: keyof typeof IMAGES;     // front
  imageBackKey?: keyof typeof IMAGES; // optional back
};

const RAW: TShopItem[] = [
  // --- Plushies ($60 = 6000¢, 60k coins) ---
  { id:"plush_nova", name:"Nova Plushie",
    description:"Soft, cuddly plushie of Nova to keep you company.",
    price:6000, coins:60000, category:"plushies",
    imageKey:"nova_plushie_purple" },

  { id:"plush_nova_devil", name:"Devil Nova Plushie",
    description:"Mischievous Nova plushie with a devilish charm.",
    price:6000, coins:60000, category:"plushies",
    imageKey:"nova_plushie_devil" },

  { id:"plush_nova_pajamas", name:"Nova Pajamas Plushie",
    description:"Adorable Nova plushie in cozy star pajamas.",
    price:6000, coins:60000, category:"plushies",
    imageKey:"plushie_nova_pajamas_front", imageBackKey:"plushie_nova_pajamas_back" },

  { id:"plush_bunny", name:"Bunny Plushie",
    description:"Classic bunny plushie with NOVA glow.",
    price:6000, coins:60000, category:"plushies",
    imageKey:"plushie_bunny_front", imageBackKey:"plushie_bunny_back" },

  { id:"plush_bunny_white", name:"Bunny Plushie — White",
    description:"Snowy white bunny plushie with teal glow.",
    price:6000, coins:60000, category:"plushies",
    imageKey:"plushie_bunny_front_white", imageBackKey:"plushie_bunny_back_white" },

  { id:"plush_star", name:"Star Plushie",
    description:"A lucky star plushie for late-night study vibes.",
    price:6000, coins:60000, category:"plushies",
    imageKey:"plushie_star" },

  { id:"plush_nova_bunny", name:"Nova Bunny Plushie",
    description:"Nova in bunny suit. Maximum cute.",
    price:6000, coins:60000, category:"plushies",
    imageKey:"nova_bunny_front" },

  // --- Apparel ($80 = 8000¢, 80k coins) ---
  { id:"beanie", name:"Nova Beanie",
    description:"Cozy knit with subtle Nova mark.",
    price:8000, coins:80000, category:"apparel", imageKey:"beanie" },

  { id:"hat", name:"Nova Cap",
    description:"Clean cap with luminous emblem.",
    price:8000, coins:80000, category:"apparel", imageKey:"hat" },

  { id:"hoodie", name:"Nova Hoodie",
    description:"Ultra-soft hoodie, glow-stitched logo.",
    price:8000, coins:80000, category:"apparel", imageKey:"hoodie" },

  { id:"sweats", name:"Nova Sweat Bottoms",
    description:"Comfy fleece joggers for deep focus.",
    price:8000, coins:80000, category:"apparel", imageKey:"sweat_bottoms" },

  { id:"pajamas", name:"Nova Pajamas",
    description:"Starry set for bedtime reading.",
    price:8000, coins:80000, category:"apparel", imageKey:"pajamas" },

  { id:"pajama_bottoms", name:"Pajama Bottoms",
    description:"Mix-and-match star bottoms.",
    price:8000, coins:80000, category:"apparel", imageKey:"pajama_bottoms" },

  // --- Themes ($10 = 1000¢, 10k coins) ---
  { id:"theme_star", name:"Star Theme",
    description:"Starry UI style.",
    price:1000, coins:10000, category:"themes", imageKey:"star_theme" },

  { id:"theme_dark", name:"Dark Theme",
    description:"Carbon black + teal glow.",
    price:1000, coins:10000, category:"themes", imageKey:"dark_theme" },

  { id:"theme_glitter", name:"Glitter Theme",
    description:"Shimmering accents for flair.",
    price:1000, coins:10000, category:"themes", imageKey:"glitter_theme" },

  { id:"theme_mint", name:"Mint Theme",
    description:"Fresh mint gradients.",
    price:1000, coins:10000, category:"themes", imageKey:"mint_theme" },

  { id:"theme_neon", name:"Neon Theme",
    description:"Bold neon highlights.",
    price:1000, coins:10000, category:"themes", imageKey:"neon_theme" },

  { id:"theme_pink", name:"Pink Theme",
    description:"Soft pink cosmic glow.",
    price:1000, coins:10000, category:"themes", imageKey:"pink_theme" },

  { id:"theme_gold", name:"Black & Gold",
    description:"Lux black with gold trim.",
    price:1000, coins:10000, category:"themes", imageKey:"theme_black_gold" },

  { id:"theme_crimson", name:"Crimson Dream",
    description:"Deep red dreams.",
    price:1000, coins:10000, category:"themes", imageKey:"theme_crimson_dream" },

  { id:"theme_emerald", name:"Emerald Wave",
    description:"Cool green swells.",
    price:1000, coins:10000, category:"themes", imageKey:"theme_emerald_wave" },

  { id:"theme_neon_purple", name:"Neon Purple",
    description:"High-contrast violet UI.",
    price:1000, coins:10000, category:"themes", imageKey:"theme_neon_purple" },

  { id:"theme_silver", name:"Silver Frost",
    description:"Icy chrome finish.",
    price:1000, coins:10000, category:"themes", imageKey:"theme_silver_frost" },

  // --- Virtual ($5 = 500¢, 5k coins) ---
  { id:"avatar_nova", name:"Avatar: Nova",
    description:"Set Nova as your avatar.",
    price:500, coins:5000, category:"virtual", imageKey:"avatar_nova" },

  { id:"cursor_orb", name:"Orb Cursor",
    description:"Floating orb pointer.",
    price:500, coins:5000, category:"virtual", imageKey:"orb_cursor" },

  { id:"cursor_glow", name:"Glow Cursor",
    description:"Subtle halo on hover.",
    price:500, coins:5000, category:"virtual", imageKey:"glow_cursor" },

  { id:"cursor_star_trail", name:"Star Trail Cursor",
    description:"Single glowing trail star.",
    price:500, coins:5000, category:"virtual", imageKey:"star_trail_cursor" },

  { id:"keychain", name:"Nova Keychain",
    description:"Metal keychain with enamel glow.",
    price:500, coins:5000, category:"virtual", imageKey:"keychain" },

  { id:"case", name:"Device Case",
    description:"Protective shell with Nova crest.",
    price:500, coins:5000, category:"virtual", imageKey:"case" },

  { id:"stationery", name:"Stationery",
    description:"Printable notes & stickers.",
    price:500, coins:5000, category:"virtual", imageKey:"stationery" },

  { id:"bundle_neon", name:"Neon Bundle",
    description:"Pack of neon goodies.",
    price:1500, coins:15000, category:"virtual", imageKey:"bundle_neon" },

  // --- Coins (visual items aren’t sellable here; use for display only)
  { id:"coins_1000", name:"1,000 Coins",
    description:"Top up your balance.",
    price:100, coins:1000, category:"coins", imageKey:"coins_1000" },

  { id:"coins_5000", name:"5,000 Coins",
    description:"Bigger boost of coins.",
    price:500, coins:5000, category:"coins", imageKey:"coins_5000" },
];

export const SHOP_ITEMS: TShopItem[] = RAW;
