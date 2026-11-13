import { SHOP_IMAGES } from "./shop_images";

export type ShopCategory = "Plushies" | "Merch" | "Accessories" | "Themes" | "Cursors" | "Bundles" | "Avatars" | "Sets";

export type ShopItem = {
  id: string;
  title: string;
  image: keyof typeof SHOP_IMAGES;
  category: ShopCategory;
  priceUSD?: number;     // tangible items use cash by default
  priceCoins?: number;   // virtual items use coins
  tangible: boolean;
  desc?: string;
};

// A sensible default catalog using ONLY keys that exist in your assets.
// Tweak titles/prices/categories anytime—UI will update automatically.
export const SHOP_ITEMS: ShopItem[] = [
  // Plushies & sets
  { id:"plushie_front", title:"Nova Plushie", image:"plushie_bunny_front", category:"Plushies", priceUSD:60,  tangible:true },
  { id:"plushie_back",  title:"Nova Plushie (Back)", image:"plushie_bunny_back", category:"Plushies", priceUSD:60, tangible:true },
  { id:"plushie_white_f", title:"Plushie (White Front)", image:"plushie_bunny_front_white", category:"Plushies", priceUSD:60, tangible:true },
  { id:"plushie_white_b", title:"Plushie (White Back)", image:"plushie_bunny_back_white", category:"Plushies", priceUSD:60, tangible:true },
  { id:"plushie_star",   title:"Plushie Star", image:"plushie_star", category:"Plushies", priceUSD:30, tangible:true },
  { id:"plushie_pjs_f",  title:"Plushie Pajamas (Front)", image:"plushie_nova_pajamas_front", category:"Sets", priceUSD:65, tangible:true },
  { id:"plushie_pjs_b",  title:"Plushie Pajamas (Back)",  image:"plushie_nova_pajamas_back",  category:"Sets", priceUSD:65, tangible:true },
  { id:"pajamas_top",    title:"Pajama Top", image:"pajamas", category:"Sets", priceUSD:35, tangible:true },
  { id:"pajamas_bottom", title:"Pajama Bottoms", image:"pajama_bottoms", category:"Sets", priceUSD:35, tangible:true },

  // Nova variants
  { id:"nova_front", title:"Nova Bunny", image:"nova_bunny_front", category:"Plushies", priceUSD:60, tangible:true },
  { id:"nova_book",  title:"Nova Bunny (Book)", image:"nova_bunny_book_plushie", category:"Plushies", priceUSD:60, tangible:true },
  { id:"nova_devil", title:"Nova Plushie Devil", image:"nova_plushie_devil", category:"Plushies", priceUSD:60, tangible:true },
  { id:"nova_purple",title:"Nova Plushie Purple", image:"nova_plushie_purple", category:"Plushies", priceUSD:60, tangible:true },

  // Merch / accessories
  { id:"beanie",  title:"Beanie",  image:"beanie",  category:"Merch", priceUSD:45, tangible:true },
  { id:"hoodie",  title:"Hoodie",  image:"hoodie",  category:"Merch", priceUSD:120, tangible:true },
  { id:"hat",     title:"Hat",     image:"hat",     category:"Merch", priceUSD:35, tangible:true },
  { id:"sweats",  title:"Sweat Bottoms", image:"sweat_bottoms", category:"Merch", priceUSD:55, tangible:true },
  { id:"keychain",title:"Keychain", image:"keychain", category:"Accessories", priceUSD:15, tangible:true },
  { id:"stationery", title:"Stationery Set", image:"stationery", category:"Accessories", priceUSD:24, tangible:true },
  { id:"case",    title:"Device Case", image:"case", category:"Accessories", priceUSD:22, tangible:true },

  // Avatars
  { id:"avatar_nova", title:"Avatar: Nova", image:"avatar_nova", category:"Avatars", priceCoins:400, tangible:false },

  // Themes (virtual → coins)
  { id:"theme_neon_purple", title:"Theme: Neon Purple", image:"theme_neon_purple", category:"Themes", priceCoins:600, tangible:false },
  { id:"theme_emerald_wave",title:"Theme: Emerald Wave", image:"theme_emerald_wave", category:"Themes", priceCoins:600, tangible:false },
  { id:"theme_crimson_dream",title:"Theme: Crimson Dream", image:"theme_crimson_dream", category:"Themes", priceCoins:600, tangible:false },
  { id:"theme_silver_frost",title:"Theme: Silver Frost", image:"theme_silver_frost", category:"Themes", priceCoins:600, tangible:false },
  { id:"theme_black_gold",  title:"Theme: Black & Gold", image:"theme_black_gold", category:"Themes", priceCoins:600, tangible:false },
  { id:"theme_neon",        title:"Theme: Neon", image:"neon_theme", category:"Themes", priceCoins:500, tangible:false },
  { id:"theme_mint",        title:"Theme: Mint", image:"mint_theme", category:"Themes", priceCoins:500, tangible:false },
  { id:"theme_dark",        title:"Theme: Dark", image:"dark_theme", category:"Themes", priceCoins:400, tangible:false },
  { id:"theme_pink",        title:"Theme: Pink", image:"pink_theme", category:"Themes", priceCoins:500, tangible:false },
  { id:"theme_glitter",     title:"Theme: Glitter", image:"glitter_theme", category:"Themes", priceCoins:700, tangible:false },
  { id:"bundle_neon",       title:"Theme Bundle: Neon", image:"bundle_neon", category:"Bundles", priceCoins:1200, tangible:false },

  // Cursors (virtual → coins)
  { id:"cursor_glow",  title:"Cursor: Glow", image:"glow_cursor", category:"Cursors", priceCoins:300, tangible:false },
  { id:"cursor_orb",   title:"Cursor: Orb",  image:"orb_cursor",  category:"Cursors", priceCoins:300, tangible:false },
  { id:"cursor_star",  title:"Cursor: Star Trail", image:"star_trail_cursor", category:"Cursors", priceCoins:350, tangible:false },

  // (Optional) visible coin images — keep if you show them in the grid
  { id:"coins_1000", title:"1,000 Coins", image:"coins_1000", category:"Bundles", priceUSD:1, tangible:false },
  { id:"coins_5000", title:"5,000 Coins", image:"coins_5000", category:"Bundles", priceUSD:5, tangible:false },
];

export const SHOP_CATEGORIES: ShopCategory[] = ["Plushies","Merch","Accessories","Themes","Cursors","Bundles","Avatars","Sets"];
