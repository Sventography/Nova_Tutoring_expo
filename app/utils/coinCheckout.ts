// app/utils/coinCheckout.ts
import * as Linking from "expo-linking";

type CoinCheckoutOpts = {
  id: string;             // sku
  title: string;
  priceCoins: number;
  category: string;
  imageUrl?: string;
  size?: string | null;
};

export function startCoinCheckout(opts: CoinCheckoutOpts) {
  // NOTE: route changed to "/coin" so it hits app/(checkout)/coin.tsx
  const url = Linking.createURL("/coin", {
    queryParams: {
      sku: opts.id,
      title: opts.title,
      category: opts.category,
      priceCoins: String(opts.priceCoins ?? 0),
      imageUrl: opts.imageUrl ?? "",
      size: opts.size || "",
    },
  });
  return Linking.openURL(url); // expo-router will handle this in-app
}
