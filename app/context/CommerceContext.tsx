import React, { createContext, useContext, useMemo } from "react";

export type Item = {
  id: string;
  name: string;
  desc?: string;
  tag?: string;
  tangible: boolean;
  priceCashUSD?: number;
  priceCoins?: number;
  virtualPriceCoins?: number;
  // for flip
  imageFront?: any;
  imageBack?: any;
  image?: any;
};

type Ctx = { catalog: Item[] };
const C = createContext<Ctx | null>(null);

export function CommerceProvider({ children }: { children: React.ReactNode }) {
  const catalog: Item[] = useMemo(
    () => [
      {
        id: "plushie_nova_front_back",
        name: "Nova Plushie",
        desc: "Soft, huggable star bunny.",
        tag: "plushie",
        tangible: true,
        priceCashUSD: 38,
        priceCoins: 1500,
        imageFront: require("../assets/shop/plushie_bunny_front.png"),
        imageBack: require("../assets/shop/plushie_bunny_back.png"),
      },
      {
        id: "plushie_nova_pjs",
        name: "Nova Pajamas Plushie",
        desc: "Comfy PJ edition!",
        tag: "premium",
        tangible: true,
        priceCashUSD: 42,
        priceCoins: 1800,
        imageFront: require("../assets/shop/plushie_nova_pajamas_front.png"),
        imageBack: require("../assets/shop/plushie_nova_pajamas_back.png"),
      },,
    ],
    []
  );

  return <C.Provider value={{ catalog }}>{children}</C.Provider>;
}

export const useCommerce = () => {
  const v = useContext(C);
  if (!v) throw new Error("useCommerce must be inside CommerceProvider");
  return v;
};
