import React, { createContext, useContext, useMemo } from "react";
import { ImageSourcePropType } from "react-native";

/** 1 coin = $0.001  (=> 1000 coins = $1) */
export type CatalogItem = {
  id: string;
  name: string;
  image: ImageSourcePropType;
  tangible: boolean;
  /** physical items */
  priceCashUSD?: number;
  priceCoins?: number;
  /** virtual items */
  virtualPriceCoins?: number;

  // optional niceties for UI
  desc?: string;
  tag?: "plushie" | "apparel" | "accessory" | "stationery" | "theme" | "cursor" | "coins" | "premium" | string;
};

// quick require helper from this file to assets
const $ = (p: string) => require(`../assets/shop/${p}`);

/** --- Default Catalog (edit freely) --- */
const DEFAULT_CATALOG: CatalogItem[] = [
  // ---------- PLUSHIES (physical) ----------
  {
    id: "plushie_nova_front",
    name: "Plushie Nova — Front",
    image: $("plushie_nova_pajamas_front.png"),
    tangible: true,
    priceCashUSD: 60,
    priceCoins: 60000,
    desc: "Snuggle Nova in her starry pajamas. Ultra-cuddly.",
    tag: "plushie",
  },
  {
    id: "plushie_nova_back",
    name: "Plushie Nova — Back",
    image: $("plushie_nova_pajamas_back.png"),
    tangible: true,
    priceCashUSD: 60,
    priceCoins: 60000,
    desc: "Starry PJs with adorable details (tailored for hugs).",
    tag: "plushie",
  },
  {
    id: "plushie_bunny_front",
    name: "Nova Bunny — Front",
    image: $("plushie_bunny_front.png"),
    tangible: true,
    priceCashUSD: 60,
    priceCoins: 60000,
    desc: "Floppy-eared bunny Nova. Limited run.",
    tag: "plushie",
  },
  {
    id: "plushie_bunny_back",
    name: "Nova Bunny — Back",
    image: $("plushie_bunny_back.png"),
    tangible: true,
    priceCashUSD: 60,
    priceCoins: 60000,
    desc: "Back view with the cutest tail. Collector fave.",
    tag: "plushie",
  },
  {
    id: "plushie_star",
    name: "Star Plushie",
    image: $("plushie_star.png"),
    tangible: true,
    priceCashUSD: 28,
    priceCoins: 28000,
    desc: "A little wish-star for your pillow.",
    tag: "plushie",
  },

  // ---------- APPAREL (physical) ----------
  {
    id: "beanie",
    name: "Nova Beanie",
    image: $("beanie.png"),
    tangible: true,
    priceCashUSD: 45,
    priceCoins: 45000,
    desc: "Warm knit with a soft glow vibe.",
    tag: "apparel",
  },
  {
    id: "hoodie",
    name: "Nova Hoodie",
    image: $("hoodie.png"),
    tangible: true,
    priceCashUSD: 120,
    priceCoins: 120000,
    desc: "Fleece-soft + star trim. Live-in comfy.",
    tag: "apparel",
  },
  {
    id: "sweat_bottoms",
    name: "Sweat Bottoms",
    image: $("sweat_bottoms.png"),
    tangible: true,
    priceCashUSD: 65,
    priceCoins: 65000,
    desc: "Soft joggers, Nova’s late-night uniform.",
    tag: "apparel",
  },
  {
    id: "pajamas",
    name: "Star PJs",
    image: $("pajamas.png"),
    tangible: true,
    priceCashUSD: 75,
    priceCoins: 75000,
    desc: "Black with cyan stars. Official cuddle set.",
    tag: "apparel",
  },

  // ---------- ACCESSORIES (physical) ----------
  { id: "keychain", name: "Nova Keychain", image: $("keychain.png"), tangible: true, priceCashUSD: 15, priceCoins: 15000, desc: "Tiny star-power for your keys.", tag: "accessory" },
  { id: "case",     name: "Phone Case",   image: $("case.png"),     tangible: true, priceCashUSD: 28, priceCoins: 28000, desc: "Sleek protection, Nova glow.", tag: "accessory" },
  { id: "hat",      name: "Hat",          image: $("hat.png"),      tangible: true, priceCashUSD: 32, priceCoins: 32000, desc: "Shade + subtle star crest.", tag: "accessory" },

  // ---------- STATIONERY (physical) ----------
  { id: "stationery", name: "Stationery Set", image: $("stationery.png"), tangible: true, priceCashUSD: 24, priceCoins: 24000, desc: "Paper, stickers, star tabs.", tag: "stationery" },

  // ---------- THEMES (virtual) ----------
  { id: "theme_neon_purple",  name: "Theme — Neon Purple",  image: $("theme_neon_purple.png"),  tangible: false, virtualPriceCoins: 15000, desc: "Turn the app into a neon dream.", tag: "theme" },
  { id: "theme_black_gold",   name: "Theme — Black & Gold", image: $("theme_black_gold.png"),   tangible: false, virtualPriceCoins: 15000, desc: "Luxury night-sky chic.", tag: "theme" },
  { id: "theme_crimson_dream",name: "Theme — Crimson Dream",image: $("theme_crimson_dream.png"),tangible: false, virtualPriceCoins: 15000, desc: "Romantic glow, bold contrast.", tag: "theme" },
  { id: "theme_emerald_wave", name: "Theme — Emerald Wave", image: $("theme_emerald_wave.png"), tangible: false, virtualPriceCoins: 15000, desc: "Cool oceanic cosmos.", tag: "theme" },
  { id: "theme_silver_frost", name: "Theme — Silver Frost", image: $("theme_silver_frost.png"), tangible: false, virtualPriceCoins: 15000, desc: "Icy starlight minimal.", tag: "theme" },
  { id: "theme_star",         name: "Theme — Star",         image: $("star_theme.png"),         tangible: false, virtualPriceCoins: 15000, desc: "Classic Nova starscape.", tag: "theme" },

  // ---------- CURSORS (virtual) ----------
  { id: "cursor_star",  name: "Cursor — Star",  image: $("star_cursor.png"),  tangible: false, virtualPriceCoins: 6000, desc: "Point with a twinkle.", tag: "cursor" },
  { id: "cursor_orb",   name: "Cursor — Orb",   image: $("orb_cursor.png"),   tangible: false, virtualPriceCoins: 6000, desc: "Smooth comet motion.", tag: "cursor" },
  { id: "cursor_glow",  name: "Cursor — Glow",  image: $("glow_cursor.png"),  tangible: false, virtualPriceCoins: 6000, desc: "Soft cyan aura trail.", tag: "cursor" },
  { id: "cursor_arrow", name: "Cursor — Arrow", image: $("arrow_cursor.png"), tangible: false, virtualPriceCoins: 6000, desc: "Clean neon arrow (1×/2×).", tag: "cursor" },

  // ---------- COINS (virtual) ----------
  { id: "coins_1000", name: "Coins — 1,000", image: $("coins_1000.png"), tangible: false, virtualPriceCoins: 1000, desc: "Quick top-up.", tag: "coins" },
  { id: "coins_5000", name: "Coins — 5,000", image: $("coins_5000.png"), tangible: false, virtualPriceCoins: 5000, desc: "Best starter pack.", tag: "coins" },
];

/** ---- Context ---- */
type CommerceContextType = {
  catalog: CatalogItem[];
  buyWithCoins: (id: string) => Promise<boolean>;
  buyWithCash: (id: string) => Promise<boolean>;
};

const CommerceContext = createContext<CommerceContextType | null>(null);

export const CommerceProvider: React.FC<React.PropsWithChildren<{ catalog?: CatalogItem[] }>> = ({
  children,
  catalog,
}) => {
  const data = useMemo(() => catalog ?? DEFAULT_CATALOG, [catalog]);

  // Simple stubs; your Shop screen does the real order + address flow.
  const buyWithCoins = async (_id: string) => {
    await new Promise(r => setTimeout(r, 300));
    return true;
  };
  const buyWithCash = async (_id: string) => {
    await new Promise(r => setTimeout(r, 300));
    return true;
  };

  return (
    <CommerceContext.Provider value={{ catalog: data, buyWithCoins, buyWithCash }}>
      {children}
    </CommerceContext.Provider>
  );
};

export const useCommerce = () => {
  const ctx = useContext(CommerceContext);
  if (!ctx) throw new Error("useCommerce must be used within <CommerceProvider>");
  return ctx;
};