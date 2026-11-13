export type CoinPackage = { id: string; label: string; coins: number; priceUSD: number };

export const COIN_PACKAGES: CoinPackage[] = [
  { id: "coins_500", label: "500 Coins", coins: 500, priceUSD: 4.99 },
  { id: "coins_1200", label: "1,200 Coins", coins: 1200, priceUSD: 9.99 },
  { id: "coins_3000", label: "3,000 Coins", coins: 3000, priceUSD: 19.99 },
  { id: "coins_7000", label: "7,000 Coins", coins: 7000, priceUSD: 39.99 }
];

export const PAYMENTS_VERSION = "v1";
