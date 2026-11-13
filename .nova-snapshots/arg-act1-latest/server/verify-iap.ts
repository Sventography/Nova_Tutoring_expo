import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

app.post("/iap/verify", async (req, res) => {
  const { platform, receipt } = req.body || {};
  if (!platform || !receipt) return res.status(400).json({ ok: false });
  try {
    res.json({ ok: true, items: [] });
  } catch {
    res.status(500).json({ ok: false });
  }
});

const port = process.env.PORT || 4001;
app.listen(port, () => {});