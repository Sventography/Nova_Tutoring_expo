const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-06-20" });

const PRODUCT_IDS = [
  "prod_TFQFvhM9kmYlQt",
  "prod_TEJSHc9w8emljK",
  "prod_TEJSSAWhQVWjMy",
  "prod_TEJRPU7nXAN1eJ",
  "prod_TEJPC8HIdX4MFP",
  "prod_TEJOLtH9hWcwqU",
  "prod_TEJNONMFOilNln",
  "prod_TEJMNCYpZmWd4G",
  "prod_TEJLpEhIzTFX69",
  "prod_TEJGuE1QYi7lpF",
  "prod_TEJFaqzUqA8g36",
  "prod_TEJEQuKVJFpMQ9",
  "prod_TEJCsJyyB6GDOQ",
  "prod_TEJ3nQpbnxBc8v",
  "prod_TEJ3Zx5MWLv9tV",
  "prod_TEIyhPxZRyjm15",
  "prod_TEIuLi7S5r8YKb",
  "prod_TEIs23HG5KHFCp",
  "prod_TEIqazLNftnz4j",
  "prod_TEIpv64N52FpdT",
  "prod_TEIokf5jy2rFFd",
  "prod_TEIoLX524g5bUk",
  "prod_TEImuiJcIEerXG",
  "prod_TEIl17OQhITvGP",
  "prod_TEIj5rSF62hp5b",
  "prod_TEIhSDjINHWg7U",
  "prod_TEIgC6JmU2ALTh",
  "prod_TEIeuYnCTjKtqU",
  "prod_TEIbGbdViXLjnW",
  "prod_TEIZRXrtjvfBo9",
  "prod_TEIXJLlS8YHGPQ"
];

// Optional: hard overrides for keys you want to use in your app
// Example: { "prod_ABC": "hoodie", "prod_DEF": "plushie_nova_front" }
const KEY_OVERRIDES = {
  // "prod_TFQFvhM9kmYlQt": "plushie_nova_front",
};

function slug(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function pickPriceId(productId) {
  const product = await stripe.products.retrieve(productId);
  if (product.default_price) {
    const p = product.default_price;
    return typeof p === "string" ? p : (p && p.id);
  }
  // fallback: first active price for this product
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 1 });
  if (prices.data.length) return prices.data[0].id;
  throw new Error(`No active price found for product ${productId}`);
}

(async () => {
  try {
    const pricesPath = path.resolve(__dirname, "..", "prices.json");
    const map = fs.existsSync(pricesPath) ? JSON.parse(fs.readFileSync(pricesPath, "utf8")) : {};

    let added = 0;
    for (const prodId of PRODUCT_IDS) {
      try {
        const product = await stripe.products.retrieve(prodId);
        const priceId = await pickPriceId(prodId);

        // choose key: override > product.metadata.sku > slug(product.name) > prodId
        const metaSku = (product.metadata && (product.metadata.sku || product.metadata.SKU)) || "";
        const baseKey = metaSku || slug(product.name) || prodId;
        const key = KEY_OVERRIDES[prodId] || baseKey;

        map[key] = {
          priceId,
          productId: prodId,
          quantity: map[key]?.quantity || 1
        };

        console.log(`[map] ${key} → price=${priceId}  (product=${prodId})`);
        added++;
      } catch (e) {
        console.warn(`[skip] ${prodId}: ${e.message}`);
      }
    }

    fs.writeFileSync(pricesPath, JSON.stringify(map, null, 2));
    console.log(`[ok] wrote ${Object.keys(map).length} entries → ${pricesPath}`);
    console.log(`[delta] processed=${PRODUCT_IDS.length}, added/updated=${added}`);
  } catch (e) {
    console.error("[make-map-from-products] error:", e.message);
    process.exit(1);
  }
})();
