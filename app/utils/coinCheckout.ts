import * as Linking from "expo-linking";

export function startCoinCheckout(opts: { id: string; title: string; priceCoins: number; size?: string; category?: string; imageUrl?: string }) {
  const url = Linking.createURL("/checkout/coin", {
    queryParams: {
      itemId: opts.id,
      title: opts.title,
      cost: String(opts.priceCoins || 0),
      size: opts.size || "",
    },
  });
  return Linking.openURL(url);
}
