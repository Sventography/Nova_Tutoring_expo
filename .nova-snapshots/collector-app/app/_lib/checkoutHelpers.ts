import { resolveProductIdForSku } from "@/_lib/stripeProducts";
import { startCheckout } from "@/utils/checkout";

type Item = { id?: string; sku?: string; key?: string; title?: string; name?: string; imageUrl?: string; priceCents?: number; };

export async function startCashCheckoutForItem(item: Item) {
  const sku = item?.sku || item?.id || item?.key;
  const productId = resolveProductIdForSku(sku || null);
  if (productId) {
    return startCheckout({ productId, quantity: 1, currency: "usd", meta: { sku } });
  }
  return startCheckout({
    sku, amount: item?.priceCents ?? 0, currency: "usd", quantity: 1,
    title: item?.title || item?.name, image: item?.imageUrl, meta: { sku },
  });
}
