import { router } from "expo-router";
import { useWallet } from "@/state/wallet";

/**
 * Navigate to the coin checkout screen with all params needed to complete the order.
 * `size` is optional and only used for items that require sizing (clothing, etc).
 */
export function startCoinCheckout(item: {
  id: string;
  title: string;
  priceCoins?: number;
  priceUSD?: number;
  imageUrl?: string;
  category?: string;
  size?: string | null;   // <— NEW
}) {
  const cost =
    item.priceCoins ??
    (item.priceUSD ? Math.round(item.priceUSD * 1000) : 0);

  const bal = useWallet.getState().coins;

  router.push({
    pathname: "/checkout/coin",
    params: {
      itemId: item.id,
      title: item.title,
      cost: String(cost),
      imageUrl: item.imageUrl || "",
      category: item.category || "",
      balance: String(bal),
      size: item.size ? String(item.size) : "",  // <— NEW
    },
  });
}
