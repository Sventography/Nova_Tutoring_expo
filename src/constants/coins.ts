export type CoinPackage = {
  id: string;
  title: string;
  coins: number;
  priceUSD: number;
  best?: boolean;
};

export const COIN_PACKAGES: CoinPackage[] = [
  { id: "coins_500", title: "Starter Pack", coins: 500, priceUSD: 4.99 },
  {
    id: "coins_1200",
    title: "Value Pack",
    coins: 1200,
    priceUSD: 9.99,
    best: true,
  },
  { id: "coins_3000", title: "Power Pack", coins: 3000, priceUSD: 19.99 },
  { id: "coins_8500", title: "Mega Pack", coins: 8500, priceUSD: 49.99 },
];
