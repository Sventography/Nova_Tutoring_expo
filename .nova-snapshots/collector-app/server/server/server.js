// server.js — Nova orders (5055) with flexible env names
const path = require("path");
const fs = require("fs");

// ---- load .env (primary, then fallback) ----
const mainEnv = path.join(__dirname, ".env");
const backupEnv = path.join(__dirname, ".env_backups/env/.env.server");
if (fs.existsSync(mainEnv)) {
  require("dotenv").config({ path: mainEnv });
  console.log("✅ Loaded env from server/.env");
} else if (fs.existsSync(backupEnv)) {
  require("dotenv").config({ path: backupEnv });
  console.log("✅ Loaded env from server/.env_backups/env/.env.server");
} else {
  console.warn("⚠️ No .env file found (server/.env or backup).");
}

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");

// ---- map envs (accept both naming styles) ----
const ENV = {
  // port
  PORT: process.env.PORT || process.env.FLASK_PORT || 5055,

  // sender creds (either style)
  STORE_EMAIL:
    process.env.STORE_EMAIL || process.env.EMAIL_USER || process.env.SMTP_USER,
  STORE_PASS:
    process.env.STORE_PASS || process.env.EMAIL_PASS || process.env.SMTP_PASS,

  // recipient (store owner)
  STORE_OWNER:
    process.env.STORE_OWNER || process.env.STORE_OWNER_EMAIL || process.env.OWNER_EMAIL,

  // service vs raw smtp
  EMAIL_SERVICE: process.env.EMAIL_SERVICE, // e.g., "Gmail"
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
};

// helpful warning if anything is missing
const REQUIRED = ["STORE_EMAIL", "STORE_PASS", "STORE_OWNER"];
const missing = REQUIRED.filter((k) => !ENV[k]);
if (missing.length) {
  console.warn("⚠️ Missing env vars:", missing.join(", "));
  console.warn("   Set them in server/.env (or backup). Examples:");
  console.warn("   STORE_EMAIL=you@gmail.com  (or EMAIL_USER)");
  console.warn("   STORE_PASS=your_app_password  (or EMAIL_PASS)");
  console.warn("   STORE_OWNER=you@gmail.com  (or STORE_OWNER_EMAIL)");
}

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

// basic rate limit
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ---- build transporter (service OR smtp) ----
let transporter = null;
try {
  if (ENV.EMAIL_SERVICE) {
    transporter = nodemailer.createTransport({
      service: ENV.EMAIL_SERVICE, // "Gmail"
      auth: { user: ENV.STORE_EMAIL, pass: ENV.STORE_PASS },
    });
  } else if (ENV.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: ENV.SMTP_HOST,
      port: Number(ENV.SMTP_PORT || 587),
      secure: ENV.SMTP_SECURE, // true for 465, false for 587/25
      auth: { user: ENV.STORE_EMAIL, pass: ENV.STORE_PASS },
    });
  } else {
    // default to Gmail service if nothing provided
    transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: { user: ENV.STORE_EMAIL, pass: ENV.STORE_PASS },
    });
  }
} catch (e) {
  console.error("✖️ Failed to create transporter:", e?.message);
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    port: Number(ENV.PORT),
    haveEnv: {
      STORE_EMAIL: !!ENV.STORE_EMAIL,
      STORE_PASS: !!ENV.STORE_PASS,
      STORE_OWNER: !!ENV.STORE_OWNER,
    },
    mode: ENV.EMAIL_SERVICE
      ? `service:${ENV.EMAIL_SERVICE}`
      : ENV.SMTP_HOST
      ? `smtp:${ENV.SMTP_HOST}:${ENV.SMTP_PORT} secure=${ENV.SMTP_SECURE}`
      : "service:Gmail(default)",
  });
});

app.post("/api/order", async (req, res) => {
  try {
    const {
      itemId,
      itemName,
      method, // "coins" | "cash"
      price,
      coins,
      customerName,
      addressLine1,
      addressLine2 = "",
      city = "",
      state = "",
      postalCode = "",
      country = "",
    } = req.body || {};

    if (!ENV.STORE_OWNER || !transporter) {
      return res.status(500).json({ ok: false, error: "email_not_configured" });
    }

    const addressBlock = [
      customerName,
      addressLine1,
      addressLine2,
      [city, state, postalCode].filter(Boolean).join(", "),
      country,
    ]
      .filter(Boolean)
      .join("\n");

    const subject = `New Order — ${itemName || itemId || "Unknown Item"}`;
    const text = `🛍️ New order received

Item: ${itemName || itemId || "(no id)"}
Method: ${
      method === "coins"
        ? `${Number(coins || 0).toLocaleString()} coins`
        : `$${Number(price || 0).toFixed(2)}`
    }

Ship to:
${addressBlock || "(no address provided)"}
`;

    await transporter.sendMail({
      from: `"Nova Shop" <${ENV.STORE_EMAIL}>`,
      to: ENV.STORE_OWNER,
      subject,
      text,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("order error:", err);
    res.status(500).json({ ok: false, error: "email_failed" });
  }
});

app.listen(Number(ENV.PORT), () => {
  console.log(`🚀 Nova shop server on http://localhost:${ENV.PORT}`);
});
