export type Rarity = "common" | "rare" | "epic" | "legendary";
export type ItemType =
  | "hat"
  | "beanie"
  | "plush"
  | "keychain"
  | "theme"
  | "bundle"
  | "clothing"
  | "stationery"
  | "case"
  | "coins";

export type ShopItem = {
  id: string;
  title: string;
  type: ItemType;
  rarity: Rarity;
  price: number;
  image: any;
  limit?: number;
};

export const shopItems: ShopItem[] = [
  {
    id: "coins_1000",
    title: "1,000 Coins",
    type: "coins",
    rarity: "common",
    price: 499,
    image: require("../assets/shop/coins_1000.png"),
  },
  {
    id: "coins_5000",
    title: "5,000 Coins",
    type: "coins",
    rarity: "rare",
    price: 1999,
    image: require("../assets/shop/coins_5000.png"),
  },
  {
    id: "hoodie_nova",
    title: "Nova Hoodie",
    type: "clothing",
    rarity: "rare",
    price: 5999,
    image: require("../assets/shop/hoodie.png"),
  },
  {
    id: "pajamas_nova",
    title: "Nova Pajama Set",
    type: "clothing",
    rarity: "epic",
    price: 7999,
    image: require("../assets/shop/pajamas.png"),
  },
  {
    id: "stationery_nova",
    title: "Nova Stationery",
    type: "stationery",
    rarity: "common",
    price: 2499,
    image: require("../assets/shop/stationery.png"),
  },
  {
    id: "case_nova",
    title: "Nova Phone Case",
    type: "case",
    rarity: "common",
    price: 2499,
    image: require("../assets/shop/case.png"),
  },
  {
    id: "plushie_star",
    title: "Nova Star Plushie",
    type: "plush",
    rarity: "epic",
    price: 3999,
    image: require("../assets/shop/plushie_star.png"),
  },
  {
    id: "plushie_bunny_black",
    title: "Nova Bunny Plushie (Black)",
    type: "plush",
    rarity: "epic",
    price: 3999,
    image: require("../assets/shop/plushie_bunny_front.png"),
  },
  {
    id: "plushie_bunny_white",
    title: "Nova Bunny Plushie (White)",
    type: "plush",
    rarity: "epic",
    price: 3999,
    image: require("../assets/shop/plushie_bunny_front_white.png"),
  },
  {
    id: "plushie_nova_pajamas",
    title: "Nova Plushie (Pajamas)",
    type: "plush",
    rarity: "epic",
    price: 3999,
    image: require("../assets/shop/plushie_nova_pajamas_front.png"),
  },
  {
    id: "plushie_nova_purple",
    title: "Nova Plushie (Purple Bow)",
    type: "plush",
    rarity: "rare",
    price: 3999,
    image: require("../assets/shop/nova_plushie_purple.png"),
  },
  {
    id: "plushie_nova_devil",
    title: "Nova Plushie (Devil Bow)",
    type: "plush",
    rarity: "legendary",
    price: 3999,
    image: require("../assets/shop/nova_plushie_devil.png"),
    limit: 500,
  },
];

export const SHOP_ITEMS = shopItems as const;
