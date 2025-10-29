// server.js (port 5055)
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");

const app = express();

/* Log all requests */
app.use(function (req, _res, next) {
  console.log(new Date().toISOString() + " " + req.method + " " + req.url);
  next();
});

app.use(helmet());
app.use(express.json({ limit: "200kb" }));

/* CORS allow-all while debugging (tighten later with CORS_ALLOWLIST) */
app.use(cors({ origin: function (_origin, cb) { cb(null, true); } }));

/* Simple rate limit */
app.use("/api/", rateLimit({ windowMs: 60 * 1000, max: 120 }));

/* Email transport */
async function createTransport() {
  var method = String(process.env.EMAIL_METHOD || "smtp").toLowerCase();
  if (method === "sendgrid") {
    var key = process.env.SENDGRID_API_KEY;
    if (!key) throw new Error("SENDGRID_API_KEY missing");
    // SendGrid SMTP relay for nodemailer
    return nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false,
      auth: { user: "apikey", pass: key }
    });
  }
  var host = process.env.SMTP_HOST;
  var port = Number(process.env.SMTP_PORT || 587);
  var secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  var user = process.env.SMTP_USER;
  var pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("Missing SMTP_* env vars");
  return nodemailer.createTransport({ host: host, port: port, secure: secure, auth: { user: user, pass: pass } });
}
var transportPromise = null;
function getTransport() {
  if (!transportPromise) transportPromise = createTransport();
  return transportPromise;
}

/* Health */
app.get("/api/health", function (_req, res) {
  res.json({ ok: true });
});

/* Preflight and helpful GET to avoid HTML 405 pages */
app.options("/api/order", cors());
app.get("/api/order", function (_req, res) {
  res.status(200).json({ ok: false, hint: "Use POST with JSON to /api/order" });
});

/* Order endpoint (validates minimally and emails you) */
app.post("/api/order", async function (req, res) {
  try {
    var d = req.body || {};
    // minimal checks (keep it robust and simple)
    if (!d.item_id || !d.item_name) return res.status(400).json({ error: "Missing item_id or item_name" });
    if (typeof d.price_usd !== "number") return res.status(400).json({ error: "price_usd must be number" });
    if (typeof d.price_coins !== "number") return res.status(400).json({ error: "price_coins must be number" });
    if (d.payment_mode !== "coins" && d.payment_mode !== "cash") return res.status(400).json({ error: "payment_mode must be 'coins' or 'cash'" });
    var s = d.shipping || {};
    var required = ["fullName", "email", "line1", "city", "state", "postalCode", "country"];
    for (var i = 0; i < required.length; i++) { if (!s[required[i]]) return res.status(400).json({ error: "Missing shipping." + required[i] }); }

    var owner = process.env.STORE_OWNER_EMAIL;
    if (!owner) return res.status(500).json({ error: "STORE_OWNER_EMAIL not configured" });

    var lines = [];
    lines.push("Item: " + d.item_name + " (id: " + d.item_id + ")");
    lines.push("Payment: " + d.payment_mode);
    lines.push("Amount: $" + d.price_usd.toFixed(2) + " | ⭑ " + d.price_coins);
    lines.push("");
    lines.push("Shipping:");
    lines.push("  Name:  " + s.fullName);
    lines.push("  Email: " + s.email);
    lines.push("  Phone: " + (s.phone || "-"));
    lines.push("  Addr1: " + s.line1);
    lines.push("  Addr2: " + (s.line2 || "-"));
    lines.push("  City:  " + s.city);
    lines.push("  State: " + s.state);
    lines.push("  ZIP:   " + s.postalCode);
    lines.push("  Country: " + s.country);
    lines.push("");
    lines.push("Received: " + new Date().toISOString());
    var textBody = lines.join("\n");

    var t = await getTransport();
    await t.sendMail({
      from: process.env.SMTP_USER || "orders@nova.local",
      to: owner,
      subject: "[Nova Order] " + d.item_name + " via " + d.payment_mode.toUpperCase(),
      text: textBody,
      html: "<pre>" + textBody.replace(/</g, "&lt;") + "</pre>"
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* Start on 5055 */
var PORT = Number(process.env.PORT || 5055);
app.listen(PORT, function () {
  console.log("Order server listening on http://127.0.0.1:" + PORT);
});

