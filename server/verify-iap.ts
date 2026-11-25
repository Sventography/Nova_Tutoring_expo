import express from "express";
const app = express();
// Retired prototype: no receipt was ever verified here.
app.post("/iap/verify", (_req, res) => {
  res.status(501).json({ ok: false, error: "Receipt verification unavailable" });
});
app.listen(process.env.PORT || 4001, () => {});
