// server/index.cjs
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const fs = require("fs");
const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// --- Stripe ---
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-06-20" });
(async () => {
  try {
    const key = process.env.STRIPE_SECRET_KEY || "";
    const acct = await stripe.accounts.retrieve();
    console.log("[stripe] key:", key.slice(0, 8) + "…", "| account:", acct.id);
    console.log("[stripe] MODE:", key.startsWith("sk_live_") ? "LIVE" : "TEST");
  } catch (e) {
    console.warn("[stripe] account retrieve failed:", e.message);
  }
})();

// --- Optional SKU -> price/amount/product map ---
const PRICE_MAP_PATH = path.resolve(__dirname, "prices.json");
let PRICE_MAP = {};
try {
  PRICE_MAP = JSON.parse(fs.readFileSync(PRICE_MAP_PATH, "utf8"));
  console.log("[price-map] loaded", Object.keys(PRICE_MAP).length, "entries");
} catch (e) {
  console.warn("[price-map] no prices.json (that’s fine):", e.message);
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    hasKey: Boolean(process.env.STRIPE_SECRET_KEY),
    mappedSkus: Object.keys(PRICE_MAP),
  });
});

// ---------- Resolvers ----------

/** Resolve from explicit query params */
function fromQuery(q) {
  const quantity = Number(q.quantity || 1);
  if (q.price_id) {
    return { line_items: [{ price: String(q.price_id), quantity }], source: "query:price_id" };
  }
  if (q.amount_cents) {
    return {
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: String(q.sku || "Nova Item") },
          unit_amount: Number(q.amount_cents),
        },
        quantity,
      }],
      source: "query:amount_cents",
    };
  }
  return null;
}

/** Resolve price id from a product id (prefer default_price; otherwise first active price) */
async function priceIdFromProductId(productId) {
  const product = await stripe.products.retrieve(productId);
  if (product.default_price) {
    const p = product.default_price;
    if (typeof p === "string") return p;
    if (p && p.id) return p.id;
  }
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 1 });
  if (prices.data.length) return prices.data[0].id;
  throw new Error(`No active price found for product ${productId}`);
}

/** Resolve line_items from productId */
async function fromProductId(productId, quantity = 1) {
  const priceId = await priceIdFromProductId(productId);
  return { line_items: [{ price: priceId, quantity: Number(quantity || 1) }], source: "product_id" };
}

/** Resolve price via lookup_key (works across test/live if both modes set the same lookup_key) */
async function priceIdFromLookupKey(lookup_key) {
  const prices = await stripe.prices.list({ lookup_keys: [lookup_key], active: true, limit: 1 });
  if (!prices.data.length) throw new Error(`No active price for lookup_key=${lookup_key} in this mode`);
  return prices.data[0].id;
}
async function fromLookupKey(lookup_key, quantity = 1) {
  const priceId = await priceIdFromLookupKey(lookup_key);
  return { line_items: [{ price: priceId, quantity: Number(quantity || 1) }], source: "lookup_key" };
}

/** Resolve from SKU map. Supports { priceId }, { amountCents }, or { productId }. */
async function fromSkuAsync(sku, quantityOverride) {
  if (!sku) return null;
  const entry = PRICE_MAP[sku];
  if (!entry) return null;
  const quantity = Number(quantityOverride || entry.quantity || 1);

  if (entry.priceId) {
    return { line_items: [{ price: entry.priceId, quantity }], source: "map:priceId" };
  }
  if (entry.productId) {
    const priceId = await priceIdFromProductId(entry.productId);
    return { line_items: [{ price: priceId, quantity }], source: "map:productId" };
  }
  if (entry.amountCents) {
    return {
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: sku },
          unit_amount: Number(entry.amountCents),
        },
        quantity,
      }],
      source: "map:amountCents",
    };
  }
  return null;
}

// ---------- Routes ----------

/**
 * GET /checkout?
 *    price_id=price_... | lookup_key=... | product_id=prod_... | sku=... | amount_cents=...
 *    &quantity=1&success=/purchases&cancel=/shop
 */
app.get("/checkout", async (req, res) => {
  try {
    const { product_id, lookup_key, sku } = req.query;
    const quantity = Number(req.query.quantity || 1);
    const successPath = String(req.query.success || "/purchases");
    const cancelPath  = String(req.query.cancel  || "/shop");
    const origin = process.env.CHECKOUT_ORIGIN || "http://localhost:8081";

    let config = fromQuery(req.query);
    if (!config && lookup_key) config = await fromLookupKey(String(lookup_key), quantity);
    if (!config && product_id) config = await fromProductId(String(product_id), quantity);
    if (!config && sku)        config = await fromSkuAsync(String(sku), quantity);

    if (!config) {
      return res.status(400).send("Provide one of: product_id | price_id | amount_cents | sku | lookup_key");
    }

    console.log("[/checkout] creating session", { source: config.source, line_items: config.line_items });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: config.line_items,
      success_url: origin.replace(/\/+$/, "") + successPath,
      cancel_url: origin.replace(/\/+$/, "") + cancelPath,
      metadata: {
        product_id: product_id || null,
        sku: sku || null,
        lookup_key: lookup_key || null,
      },
    });

    return res.redirect(303, session.url);
  } catch (e) {
    console.error("[/checkout] error:", e?.message);
    return res.status(500).send(e?.message || "checkout_failed");
  }
});

/**
 * POST /checkout/start
 * JSON body: { priceId | lookupKey | productId | amountCents | sku, quantity, meta, successPath, cancelPath }
 */
app.post("/checkout/start", async (req, res) => {
  try {
    const { productId, priceId, lookupKey, amountCents, sku, quantity = 1, meta = {}, successPath = "/purchases", cancelPath = "/shop" } = req.body || {};
    const origin = process.env.CHECKOUT_ORIGIN || "http://localhost:8081";

    let config = null;
    if (priceId) {
      config = { line_items: [{ price: priceId, quantity: Number(quantity) }], source: "body:priceId" };
    } else if (lookupKey) {
      config = await fromLookupKey(String(lookupKey), quantity);
    } else if (productId) {
      config = await fromProductId(String(productId), quantity);
    } else if (amountCents) {
      config = {
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: sku || "Nova Item" },
            unit_amount: Number(amountCents)
          },
          quantity: Number(quantity),
        }],
        source: "body:amountCents",
      };
    } else if (sku) {
      config = await fromSkuAsync(String(sku), quantity);
    }

    if (!config) return res.status(400).json({ error: "Provide productId | priceId | lookupKey | amountCents | sku" });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: config.line_items,
      success_url: origin.replace(/\/+$/, "") + successPath,
      cancel_url: origin.replace(/\/+$/, "") + cancelPath,
      metadata: { sku: sku || null, product_id: productId || null, lookup_key: lookupKey || null, ...meta },
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error("[/checkout/start] error:", e?.message);
    res.status(500).json({ error: e?.message || "checkout_start_failed" });
  }
});

// --- Start ---
const PORT = Number(process.env.PORT || 8787);
app.listen(PORT, () => console.log("listening", PORT));
