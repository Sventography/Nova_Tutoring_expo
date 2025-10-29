// server.js — Nova orders + Stripe checkout (PORT 8787)
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");
const Stripe = require("stripe");
const bodyParser = require("body-parser");

const app = express();

/* -------------------------------------------------
 * Config / logging
 * ------------------------------------------------- */
const cfg = {
  STORE_OWNER_EMAIL: process.env.STORE_OWNER_EMAIL || "",
  EMAIL_METHOD: (process.env.EMAIL_METHOD || "smtp").toLowerCase(),
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_SECURE: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
  SMTP_USER: process.env.SMTP_USER || "",
  APP_BASE_URL: process.env.APP_BASE_URL || "", // optional (kept for debug page)
  APP_SCHEME: process.env.APP_SCHEME || "novashop",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
  PORT: Number(process.env.PORT || 8787),
};

console.log("CONFIG → CWD:", __dirname);
console.log("CONFIG → STORE_OWNER_EMAIL:", cfg.STORE_OWNER_EMAIL || "(MISSING)");
console.log("CONFIG → EMAIL_METHOD:", cfg.EMAIL_METHOD);
console.log("CONFIG → SMTP_HOST:", cfg.SMTP_HOST || "(MISSING)");
console.log("CONFIG → SMTP_PORT:", cfg.SMTP_PORT);
console.log("CONFIG → SMTP_SECURE:", cfg.SMTP_SECURE);
console.log("CONFIG → SMTP_USER:", cfg.SMTP_USER || "(MISSING)");
console.log("CONFIG → APP_BASE_URL:", cfg.APP_BASE_URL || "(MISSING)");
console.log("CONFIG → APP_SCHEME:", cfg.APP_SCHEME);
console.log("CONFIG → STRIPE_SECRET_KEY:", cfg.STRIPE_SECRET_KEY ? "(set)" : "(MISSING)");
console.log("CONFIG → STRIPE_WEBHOOK_SECRET:", cfg.STRIPE_WEBHOOK_SECRET ? "(set)" : "(MISSING)");

const stripe = cfg.STRIPE_SECRET_KEY
  ? new Stripe(cfg.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })
  : null;

/* -------------------------------------------------
 * Middleware order (webhook FIRST with raw body)
 * ------------------------------------------------- */
app.use((req, _res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: (_o, cb) => cb(null, true) }));

// --- Stripe webhook: must be raw, and must be registered BEFORE express.json()
app.post(
  "/stripe/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    if (!stripe) return res.status(500).json({ error: "Stripe not configured" });
    const sig = req.headers["stripe-signature"];
    try {
      const event = stripe.webhooks.constructEvent(req.body, sig, cfg.STRIPE_WEBHOOK_SECRET);

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          const sku = session.metadata?.sku || "";
          console.log("✅ Paid:", { sku, sessionId: session.id });
          // If you want: trigger fulfillment here (coins, email, etc.)
          break;
        }
        default:
          // other events as needed
          break;
      }

      res.json({ received: true });
    } catch (err) {
      console.error("❌ Webhook verification failed:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);

// Everything else can be JSON
app.use(express.json({ limit: "200kb" }));

// rate-limit ONLY app API (leave Stripe routes unthrottled)
app.use("/api/", rateLimit({ windowMs: 60 * 1000, max: 120 }));

/* -------------------------------------------------
 * Nodemailer transport
 * ------------------------------------------------- */
async function createTransport() {
  if (cfg.EMAIL_METHOD === "sendgrid") {
    const key = process.env.SENDGRID_API_KEY;
    if (!key) throw new Error("SENDGRID_API_KEY missing");
    return nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false,
      auth: { user: "apikey", pass: key },
    });
  }
  // SMTP
  if (!cfg.SMTP_HOST || !cfg.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP config incomplete: set SMTP_HOST, SMTP_USER, SMTP_PASS (+ SMTP_PORT/SMTP_SECURE).");
  }
  return nodemailer.createTransport({
    host: cfg.SMTP_HOST,
    port: cfg.SMTP_PORT,
    secure: cfg.SMTP_SECURE,
    auth: { user: cfg.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}
let transportPromise;
function getTransport() {
  if (!transportPromise) transportPromise = createTransport();
  return transportPromise;
}

/* -------------------------------------------------
 * Health / debug
 * ------------------------------------------------- */
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/debug-env", (_req, res) => {
  res.json({
    STORE_OWNER_EMAIL: cfg.STORE_OWNER_EMAIL || null,
    EMAIL_METHOD: cfg.EMAIL_METHOD,
    SMTP_HOST: cfg.SMTP_HOST || null,
    SMTP_PORT: cfg.SMTP_PORT,
    SMTP_SECURE: cfg.SMTP_SECURE,
    SMTP_USER: cfg.SMTP_USER || null,
    APP_BASE_URL: cfg.APP_BASE_URL || null,
    APP_SCHEME: cfg.APP_SCHEME,
    STRIPE_SECRET_KEY: !!cfg.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: !!cfg.STRIPE_WEBHOOK_SECRET,
  });
});

/* -------------------------------------------------
 * Email order endpoint
 * ------------------------------------------------- */
app.options("/api/order", cors());
app.get("/api/order", (_req, res) =>
  res.json({ ok: false, hint: "Use POST with JSON to /api/order" })
);

app.post("/api/order", async (req, res) => {
  try {
    const d = req.body || {};
    const s = d.shipping || {};
    const owner = cfg.STORE_OWNER_EMAIL || cfg.SMTP_USER;
    if (!owner) return res.status(500).json({ error: "No recipient email configured" });

    const textBody = `
Item: ${d.item_name} (id: ${d.item_id})
Payment: ${d.payment_mode}
Amount: $${d.price_usd} | ⭑ ${d.price_coins}

Shipping:
  Name: ${s.fullName}
  Email: ${s.email}
  Phone: ${s.phone || "-"}
  Addr1: ${s.line1}
  Addr2: ${s.line2 || "-"}
  City: ${s.city}
  State: ${s.state}
  ZIP: ${s.postalCode}
  Country: ${s.country}

Received: ${new Date().toISOString()}
`.trim();

    const t = await getTransport();
    await t.sendMail({
      from: cfg.SMTP_USER || "orders@nova.local",
      to: owner,
      subject: `[Nova Order] ${d.item_name} via ${(d.payment_mode || "").toUpperCase()}`,
      text: textBody,
      html: `<pre>${textBody.replace(/</g, "&lt;")}</pre>`,
    });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/* -------------------------------------------------
 * Prices / Titles
 * ------------------------------------------------- */
const PRICES = {
  plushie_nova_pajamas: 60,
  plushie_bunny_classic: 60,
  plushie_bunny_white: 60,
  plushie_star: 60,
  plushie_bunny_book: 60,
  plushie_devil: 60,
  plushie_purple: 60,
  tee_nova_glow: 80,
  hoodie_nova: 120,
  beanie_nova: 45,
  pajamas: 90,
  pajama_bottoms: 50,
  sweat_bottoms: 70,
  hat: 60,
  keychain_nova: 30,
  stationery_set: 48,
  phone_case: 40,
  cursor_glow: 3,
  cursor_orb: 3,
  cursor_star_trail: 3,
  theme_neon: 6,
  theme_starry: 6,
  theme_pink: 6,
  theme_dark: 6,
  theme_mint: 6,
  theme_glitter: 6,
  theme_black_gold: 6,
  theme_crimson_dream: 6,
  theme_emerald_wave: 6,
  theme_neon_purple: 6,
  theme_silver_frost: 6,
  bundle_neon: 12,
  pack_1k: 1,
  pack_5k: 5,
};

const TITLES = {
  plushie_nova_pajamas: "Nova Plushie (Pajamas)",
  plushie_bunny_classic: "Bunny Plushie (Classic)",
  plushie_bunny_white: "Bunny Plushie (White)",
  plushie_star: "Star Plushie",
  plushie_bunny_book: "Bunny Plushie (Book)",
  plushie_devil: "Nova Plushie Devil",
  plushie_purple: "Nova Plushie Purple",
  tee_nova_glow: "Nova Glow Tee",
  hoodie_nova: "Nova Hoodie",
  beanie_nova: "Nova Beanie",
  pajamas: "Pajamas (Set)",
  pajama_bottoms: "Pajama Bottoms",
  sweat_bottoms: "Sweat Bottoms",
  hat: "Hat",
  keychain_nova: "Nova Keychain",
  stationery_set: "Stationery Set",
  phone_case: "Phone Case",
  cursor_glow: "Cursor: Glow",
  cursor_orb: "Cursor: Orb Glow",
  cursor_star_trail: "Cursor: Star Trail",
  theme_neon: "Theme: Neon Nova",
  theme_starry: "Theme: Starry Night",
  theme_pink: "Theme: Pink Dawn",
  theme_dark: "Theme: Dark Nova",
  theme_mint: "Theme: Mint Breeze",
  theme_glitter: "Theme: Glitter",
  theme_black_gold: "Theme: Black & Gold",
  theme_crimson_dream: "Theme: Crimson Dream",
  theme_emerald_wave: "Theme: Emerald Wave",
  theme_neon_purple: "Theme: Neon Purple",
  theme_silver_frost: "Theme: Silver Frost",
  bundle_neon: "Neon Starter Bundle",
  pack_1k: "1,000 Coins",
  pack_5k: "5,000 Coins",
};

const NEEDS_SHIPPING = new Set([
  "plushie_nova_pajamas","plushie_bunny_classic","plushie_bunny_white","plushie_star",
  "plushie_bunny_book","plushie_devil","plushie_purple",
  "tee_nova_glow","hoodie_nova","beanie_nova","pajamas","pajama_bottoms","sweat_bottoms","hat",
  "keychain_nova","stationery_set","phone_case",
]);

/* -------------------------------------------------
 * Stripe Checkout (deep-links back to app)
 * ------------------------------------------------- */
app.get("/checkout/start", async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: "Stripe not configured" });
    const sku = String(req.query.sku || "");
    const usd = PRICES[sku];
    if (!sku || typeof usd !== "number") return res.status(400).json({ error: "Unknown or missing sku" });

    // ✅ Deep-links: go straight back to the app, not Vercel
    const success_url = `${cfg.APP_SCHEME}://purchase/success?sku=${encodeURIComponent(sku)}&tx={CHECKOUT_SESSION_ID}`;
    const cancel_url  = `${cfg.APP_SCHEME}://shop`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: Math.round(usd * 100),
          product_data: { name: TITLES[sku] || sku, metadata: { sku } },
        },
        quantity: 1,
      }],
      success_url,
      cancel_url,
      metadata: { sku },
      ...(NEEDS_SHIPPING.has(sku)
        ? { shipping_address_collection: { allowed_countries: ["US","CA","GB","AU","NZ","IE"] } }
        : {}),
    });

    return res.redirect(303, session.url);
  } catch (err) {
    console.error("checkout/start error:", err);
    res.status(500).json({ error: "Failed to start checkout" });
  }
});

/* -------------------------------------------------
 * Success / cancel pages (optional web fallback)
 * ------------------------------------------------- */
app.get("/checkout/success", (req, res) => {
  const sku = String(req.query.sku || "");
  const tx  = String(req.query.tx  || "");
  const deeplink = `${cfg.APP_SCHEME}://purchase/success?sku=${encodeURIComponent(sku)}&tx=${encodeURIComponent(tx)}`;

  res.setHeader("Content-Type", "text/html");
  res.send(`<!doctype html><html><head><meta charset="utf-8"/>
  <title>Finishing purchase…</title><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>:root{color-scheme:dark}body{background:#061019;color:#cfeaf0;font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0}.card{max-width:560px;padding:28px;border:1px solid #0b2a36;border-radius:14px;background:#071923}h2{margin:0 0 8px}</style>
  <script>window.location.href=${JSON.stringify(deeplink)};setTimeout(()=>{document.getElementById('msg').textContent='If the app didn’t open, your payment is complete. You can return to the app now.'},900);</script>
  </head><body><div class="card"><h2>Completing your purchase…</h2><p id="msg">Handing off to the app now.</p></div></body></html>`);
});

app.get("/checkout/cancel", (_req, res) =>
  res.send("Checkout canceled. You may close this tab and return to the app.")
);

/* -------------------------------------------------
 * Fulfillment helper (client polls after success)
 * ------------------------------------------------- */
const OWNABLE = new Set([
  "tee_nova_glow","hoodie_nova","beanie_nova","pajamas","pajama_bottoms","sweat_bottoms","hat",
  "cursor_glow","cursor_orb","cursor_star_trail",
  "theme_neon","theme_starry","theme_pink","theme_dark","theme_mint","theme_glitter",
  "theme_black_gold","theme_crimson_dream","theme_emerald_wave","theme_neon_purple","theme_silver_frost",
  "plushie_nova_pajamas","plushie_bunny_classic","plushie_bunny_white","plushie_star",
  "plushie_bunny_book","plushie_devil","plushie_purple","bundle_neon"
]);
const COIN_PACKS = { pack_1k: 1000, pack_5k: 5000 };

app.post("/api/fulfill", async (req, res) => {
  try {
    const { sku, tx, shipping } = req.body || {};
    if (!sku) return res.status(400).json({ ok:false, error:"Missing sku" });

    if (sku in COIN_PACKS) return res.json({ ok:true, type:"coins", coins:COIN_PACKS[sku], tx });
    if (OWNABLE.has(sku))   return res.json({ ok:true, type:"ownable", sku, tx });

    if (shipping) {
      const owner = cfg.STORE_OWNER_EMAIL || cfg.SMTP_USER;
      if (!owner) return res.status(500).json({ ok:false, error:"No recipient email configured" });

      const body = `
Tangible order (via /api/fulfill)
SKU: ${sku}
TX: ${tx || "-"}
Ship To:
  Name: ${shipping.fullName}
  Email: ${shipping.email}
  Phone: ${shipping.phone || "-"}
  Addr1: ${shipping.line1}
  Addr2: ${shipping.line2 || "-"}
  City: ${shipping.city}
  State: ${shipping.state}
  ZIP: ${shipping.postalCode}
  Country: ${shipping.country}
Received: ${new Date().toISOString()}
`.trim();

      const t = await getTransport();
      await t.sendMail({
        from: cfg.SMTP_USER,
        to: owner,
        subject: `[Nova Tangible] ${sku} requested`,
        text: body,
        html: `<pre>${body.replace(/</g,"&lt;")}</pre>`
      });
      return res.json({ ok:true, type:"tangible", sku, tx });
    }

    return res.status(400).json({ ok:false, error:`Unknown SKU: ${sku}` });
  } catch (e) {
    console.error("fulfill error:", e);
    res.status(500).json({ ok:false, error:"Server error" });
  }
});

/* -------------------------------------------------
 * Boot
 * ------------------------------------------------- */
app.listen(cfg.PORT, () =>
  console.log("✔ Server listening on http://127.0.0.1:" + cfg.PORT)
);
