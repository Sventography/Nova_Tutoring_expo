const path = require("path");
const fs = require("fs");

// load .env (server/.env then backup)
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

// accept both naming schemes
const ENV = {
  PORT: process.env.PORT || process.env.FLASK_PORT || 5055,
  STORE_EMAIL: process.env.STORE_EMAIL || process.env.EMAIL_USER || process.env.SMTP_USER,
  STORE_PASS: process.env.STORE_PASS || process.env.EMAIL_PASS || process.env.SMTP_PASS,
  STORE_OWNER: process.env.STORE_OWNER || process.env.STORE_OWNER_EMAIL || process.env.OWNER_EMAIL,
  EMAIL_SERVICE: process.env.EMAIL_SERVICE,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
};

const REQUIRED = ["STORE_EMAIL", "STORE_PASS", "STORE_OWNER"];
const missing = REQUIRED.filter((k) => !ENV[k]);
if (missing.length) {
  console.warn("⚠️ Missing env vars:", missing.join(", "));
}

let transporter = null;
try {
  if (ENV.EMAIL_SERVICE) {
    transporter = nodemailer.createTransport({
      service: ENV.EMAIL_SERVICE,
      auth: { user: ENV.STORE_EMAIL, pass: ENV.STORE_PASS },
    });
  } else if (ENV.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: ENV.SMTP_HOST,
      port: Number(ENV.SMTP_PORT || 587),
      secure: ENV.SMTP_SECURE,
      auth: { user: ENV.STORE_EMAIL, pass: ENV.STORE_PASS },
    });
  } else {
    transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: { user: ENV.STORE_EMAIL, pass: ENV.STORE_PASS },
    });
  }
} catch (e) {
  console.error("✖️ transporter error:", e?.message);
}

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

app.get("/api/health", (_req, res) =>
  res.json({
    ok: true,
    port: Number(ENV.PORT),
    haveEnv: { STORE_EMAIL: !!ENV.STORE_EMAIL, STORE_PASS: !!ENV.STORE_PASS, STORE_OWNER: !!ENV.STORE_OWNER },
  })
);

app.post("/api/order", async (req, res) => {
  try {
    const { name, address, item } = req.body || {};
    if (!transporter || !ENV.STORE_OWNER) return res.status(500).json({ ok: false, error: "email_not_configured" });

    await transporter.sendMail({
      from: `"Nova Shop" <${ENV.STORE_EMAIL}>`,
      to: ENV.STORE_OWNER,
      subject: `New Order — ${item?.name || "Unknown Item"}`,
      text:
`🛍️ New order

Item: ${item?.name || "(no name)"}
Method: ${item?.method || "(unknown)"} ${item?.method === "coins" ? `(${Number(item?.coins||0).toLocaleString()} coins)` : item?.price != null ? `($${Number(item?.price).toFixed(2)})` : ""}

Ship to:
${name || ""}${name && address ? "\n" : ""}${address || "(no address provided)"}
`,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("order error:", err);
    res.status(500).json({ ok: false, error: "email_failed" });
  }
});

app.listen(Number(ENV.PORT), () => console.log(`🚀 Nova shop server on http://localhost:${ENV.PORT}`));
