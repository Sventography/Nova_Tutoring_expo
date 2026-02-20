// app/context/CommerceContext.tsx
import React, { createContext, useContext, useMemo } from "react";

export type Item = {
  id: string;                 // canonical SKU / entitlement id
  name: string;
  desc?: string;
  tag?: string;               // "plushie", "theme", "cursor", "companion", etc.
  tangible: boolean;

  // Pricing – cash and/or coins
  priceCashUSD?: number;      // real-money price (Stripe)
  priceCoins?: number;        // coins when used as a tangible
  virtualPriceCoins?: number; // coins when it’s a pure digital unlock

  // Optional images for UI (we use shop assets only here)
  imageFront?: any;
  imageBack?: any;
  image?: any;
};

type Ctx = { catalog: Item[] };

const CommerceContext = createContext<Ctx | null>(null);

export function CommerceProvider({ children }: { children: React.ReactNode }) {
  const catalog: Item[] = useMemo(
    () => [
      /* ----------------------- Plushies / tangibles ---------------------- */

      {
        id: "plushie_nova_standard",
        name: "Nova Bunny Plushie",
        desc: "Soft, huggable star bunny.",
        tag: "plushie",
        tangible: true,
        priceCashUSD: 38,
        priceCoins: 1500,
        imageFront: require("../assets/shop/plushie_bunny_front.png"),
        imageBack: require("../assets/shop/plushie_bunny_back.png"),
      },
      {
        id: "plushie_nova_pajamas",
        name: "Nova Pajamas Plushie",
        desc: "Cuddly Nova in cozy pajamas.",
        tag: "plushie",
        tangible: true,
        priceCashUSD: 42,
        priceCoins: 1800,
        imageFront: require("../assets/shop/plushie_nova_pajamas_front.png"),
        imageBack: require("../assets/shop/plushie_nova_pajamas_back.png"),
      },
      {
        id: "plushie_nova_book",
        name: "Book Bunny Plushie",
        desc: "Study buddy with a little book.",
        tag: "plushie",
        tangible: true,
        priceCashUSD: 42,
        priceCoins: 1900,
        imageFront: require("../assets/shop/nova_bunny_book_plushie_front.png"),
        imageBack: require("../assets/shop/nova_bunny_book_plushie_back.png"),
      },
      {
        id: "plushie_nova_devil",
        name: "Nova Devil Plushie",
        desc: "Playfully mischievous version of Nova.",
        tag: "plushie",
        tangible: true,
        priceCashUSD: 44,
        priceCoins: 2000,
        imageFront: require("../assets/shop/nova_plushie_devil_front.png"),
        imageBack: require("../assets/shop/nova_plushie_devil_back.png"),
      },
      {
        id: "plushie_nova_purple",
        name: "Purple Nova Plushie",
        desc: "Lavender-hued plushie for purple lovers.",
        tag: "plushie",
        tangible: true,
        priceCashUSD: 44,
        priceCoins: 2200,
        imageFront: require("../assets/shop/nova_plushie_purple_front.png"),
        imageBack: require("../assets/shop/nova_plushie_purple_back.png"),
      },

      {
        id: "beanie_nova",
        name: "Nova Beanie",
        desc: "Cozy beanie with Nova flair.",
        tag: "clothing",
        tangible: true,
        priceCashUSD: 28,
        priceCoins: 1200,
        image: require("../assets/shop/beanie.png"),
      },
      {
        id: "hat_nova",
        name: "Nova Hat",
        desc: "Cap with the Nova logo.",
        tag: "clothing",
        tangible: true,
        priceCashUSD: 32,
        priceCoins: 1300,
        image: require("../assets/shop/hat.png"),
      },
      {
        id: "tee_nova_glow",
        name: "Nova Glow Tee",
        desc: "Glowing Nova shirt.",
        tag: "clothing",
        tangible: true,
        priceCashUSD: 40,
        priceCoins: 1700,
        image: require("../assets/shop/tee_front_glow.png"),
      },
      {
        id: "hoodie_nova",
        name: "Nova Hoodie",
        desc: "Warm hoodie with Nova branding.",
        tag: "clothing",
        tangible: true,
        priceCashUSD: 60,
        priceCoins: 2500,
        image: require("../assets/shop/hoodie.png"),
      },
      {
        id: "pajamas_nova_set",
        name: "Nova Pajama Set",
        desc: "Matching Nova top and bottoms.",
        tag: "clothing",
        tangible: true,
        priceCashUSD: 55,
        priceCoins: 2300,
        image: require("../assets/shop/pajamas.png"),
      },
      {
        id: "pajama_bottoms_nova",
        name: "Nova Pajama Bottoms",
        desc: "Comfy bottoms with Nova pattern.",
        tag: "clothing",
        tangible: true,
        priceCashUSD: 35,
        priceCoins: 1500,
        image: require("../assets/shop/pajama_bottoms.png"),
      },

      {
        id: "keychain_nova",
        name: "Nova Keychain",
        desc: "Cute little Nova for your keys.",
        tag: "tangible",
        tangible: true,
        priceCashUSD: 16,
        priceCoins: 600,
        image: require("../assets/shop/keychain.png"),
      },
      {
        id: "case_nova",
        name: "Nova Phone Case",
        desc: "Protective case with Nova art.",
        tag: "tangible",
        tangible: true,
        priceCashUSD: 28,
        priceCoins: 1100,
        image: require("../assets/shop/case.png"),
      },
      {
        id: "stationery_nova",
        name: "Nova Stationery Pack",
        desc: "Stickers, notepad, and more.",
        tag: "tangible",
        tangible: true,
        priceCashUSD: 22,
        priceCoins: 900,
        image: require("../assets/shop/stationery.png"),
      },

      /* --------------------------- Coin packs ----------------------------- */

      {
        id: "coin_pack_1000",
        name: "1,000 Coins",
        desc: "Small starter pack.",
        tag: "coin_pack",
        tangible: false,
        priceCashUSD: 4,
        image: require("../assets/shop/coins_1000.png"),
      },
      {
        id: "coin_pack_5000",
        name: "5,000 Coins",
        desc: "Best value starter pack.",
        tag: "coin_pack",
        tangible: false,
        priceCashUSD: 15,
        image: require("../assets/shop/coins_5000.png"),
      },

      /* --------------------------- Themes (digital) ----------------------- */

      {
        id: "theme:neon",
        name: "Neon Nova",
        desc: "Bright neon gradients and glow.",
        tag: "theme",
        tangible: false,
        virtualPriceCoins: 1000,
        image: require("../assets/shop/neon_theme.png"),
      },
      {
        id: "theme:mint",
        name: "Mint Breeze",
        desc: "Cool mint tones, soft gradients.",
        tag: "theme",
        tangible: false,
        virtualPriceCoins: 1000,
        image: require("../assets/shop/mint_theme.png"),
      },
      {
        id: "theme:glitter",
        name: "Glitter Nova",
        desc: "Sparkly glitter-style UI.",
        tag: "theme",
        tangible: false,
        virtualPriceCoins: 1200,
        image: require("../assets/shop/glitter_theme.png"),
      },
      {
        id: "theme:dark",
        name: "Dark Nova",
        desc: "Deep, moody night-mode.",
        tag: "theme",
        tangible: false,
        virtualPriceCoins: 800,
        image: require("../assets/shop/dark_theme.png"),
      },
      {
        id: "theme:pink",
        name: "Pink Dawn",
        desc: "Soft pink gradients.",
        tag: "theme",
        tangible: false,
        virtualPriceCoins: 900,
        image: require("../assets/shop/pink_theme.png"),
      },

      /* --------------------------- Cursors (digital) ---------------------- */

      {
        id: "cursor:glow",
        name: "Glow Cursor",
        desc: "Soft glowing pointer.",
        tag: "cursor",
        tangible: false,
        virtualPriceCoins: 700,
        image: require("../assets/shop/glow_cursor.png"),
      },
      {
        id: "cursor:orb",
        name: "Orb Cursor",
        desc: "Floating orb style cursor.",
        tag: "cursor",
        tangible: false,
        virtualPriceCoins: 700,
        image: require("../assets/shop/orb_cursor.png"),
      },
      {
        id: "cursor:star_trail",
        name: "Star Trail Cursor",
        desc: "Pointer that leaves star trails.",
        tag: "cursor",
        tangible: false,
        virtualPriceCoins: 900,
        image: require("../assets/shop/star_trail_cursor.png"),
      },

      /* ---------------------- Companions (digital only) ------------------- */
      // These don’t load images from ../companions to avoid Metro errors.
      // The actual companion art is already handled in COMPANIONS catalog
      // used by the Shop tab; here we just care about ids + prices.

      {
        id: "companion:study_bunny",
        name: "Study Bunny",
        desc: "Keeps you company while you work.",
        tag: "companion",
        tangible: false,
        virtualPriceCoins: 1000,
      },
      {
        id: "companion:sleepy_moon",
        name: "Sleepy Moon",
        desc: "Calm little moon for relax tab.",
        tag: "companion",
        tangible: false,
        virtualPriceCoins: 1000,
      },
      {
        id: "companion:party_star",
        name: "Party Star",
        desc: "Bouncy star for celebrations.",
        tag: "companion",
        tangible: false,
        virtualPriceCoins: 1000,
      },
      {
        id: "companion:coin_sprite",
        name: "Coin Sprite",
        desc: "Tiny sprite who loves coins.",
        tag: "companion",
        tangible: false,
        virtualPriceCoins: 1000,
      },
      {
        id: "companion:reader",
        name: "Reading Nova",
        desc: "Bookish little companion.",
        tag: "companion",
        tangible: false,
        virtualPriceCoins: 1000,
      },

      /* -------- Legendary Companions – cash-only microtransactions -------- */

      {
        id: "companion:astral_nova",
        name: "Astral Nova",
        desc: "Legendary starlit Nova companion.",
        tag: "companion",
        tangible: false,
        priceCashUSD: 12.99,
      },
      {
        id: "companion:axolotl_oracle",
        name: "Axolotl Oracle",
        desc: "Mystic little axolotl guide.",
        tag: "companion",
        tangible: false,
        priceCashUSD: 12.99,
      },
      {
        id: "companion:celestra",
        name: "Celestra",
        desc: "Celestial guardian of your study space.",
        tag: "companion",
        tangible: false,
        priceCashUSD: 12.99,
      },
      {
        id: "companion:chrono_fox",
        name: "Chrono Fox",
        desc: "Time-twisting fox that watches your streaks.",
        tag: "companion",
        tangible: false,
        priceCashUSD: 12.99,
      },
      {
        id: "companion:mecha_owl",
        name: "Mecha Owl",
        desc: "Mechanical owl who loves late-night grinds.",
        tag: "companion",
        tangible: false,
        priceCashUSD: 12.99,
      },
      {
        id: "companion:aetherwyrm",
        name: "Aetherwyrm",
        desc: "Tiny dragon drifting through ether and notes.",
        tag: "companion",
        tangible: false,
        priceCashUSD: 12.99,
      },
    ],
    []
  );

  return (
    <CommerceContext.Provider value={{ catalog }}>
      {children}
    </CommerceContext.Provider>
  );
}

export const useCommerce = () => {
  const v = useContext(CommerceContext);
  if (!v) throw new Error("useCommerce must be inside CommerceProvider");
  return v;
};
