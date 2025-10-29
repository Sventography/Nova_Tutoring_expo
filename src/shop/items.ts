export type ShopItem = {
  id: string;
  sku: string;
  title: string;
  type: "managed" | "digital" | "physical";
  price: number;
  limited?: boolean;
};

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "cursor-star-glow",
    sku: "cursor:starGlow",
    title: "Cyan Star Cursor",
    type: "managed",
    price: 1500
  }
];
