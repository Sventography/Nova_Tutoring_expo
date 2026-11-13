const express = require("express");
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const crypto = require("crypto");

const router = express.Router();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------- simple per-IP rate limit ----------
const RATE = { windowMs: 60_000, max: 30 }; // 30 requests / minute / IP
const hits = new Map(); // ip -> [timestamps]
function rateLimit(req, res, next) {
  const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() || req.socket.remoteAddress || "ip";
  const now = Date.now();
  const wStart = now - RATE.windowMs;
  const arr = (hits.get(ip) || []).filter(t => t > wStart);
  arr.push(now);
  hits.set(ip, arr);
  if (arr.length > RATE.max) return res.status(429).json({ error: "Too many requests, slow down." });
  next();
}
router.use(rateLimit);

// ---------- file cache helpers ----------
const mem = { byDate: new Map(), byId: new Map() };
const cacheDir = path.join(process.cwd(), ".cache");
const f = (dateStr) => path.join(cacheDir, `brainteasers-${dateStr}.json`);

function hashId(s) {
  return crypto.createHash("sha1").update(String(s)).digest("hex").slice(0, 16);
}

function loadFromDisk(dateStr) {
  try {
    const p = f(dateStr);
    if (fs.existsSync(p)) {
      const j = JSON.parse(fs.readFileSync(p, "utf8"));
      if (Array.isArray(j)) {
        mem.byDate.set(dateStr, j);
        j.forEach(t => mem.byId.set(t.id, { ...t, date: dateStr }));
        return j;
      }
    }
  } catch {}
  return null;
}

function saveToDisk(dateStr, items) {
  try {
    fs.writeFileSync(f(dateStr), JSON.stringify(items, null, 2));
  } catch {}
}

async function generateTeasersForDate(dateStr) {
  if (mem.byDate.has(dateStr)) return mem.byDate.get(dateStr);
  const disk = loadFromDisk(dateStr);
  if (disk) return disk;

  const prompt = `
You are a puzzle writer. Create exactly 5 short brainteasers/riddles for the date ${dateStr}.
Output strictly as JSON with this shape:
{ "teasers": [ { "prompt": "..." }, { "prompt": "..." }, { "prompt": "..." }, { "prompt": "..." }, { "prompt": "..." } ] }
Keep each prompt under 200 characters, self-contained, and without spoilers/answers.
`;

  let teasers = [];
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8,
      messages: [
        { role: "system", content: "Return only valid JSON. No commentary." },
        { role: "user", content: prompt },
      ],
    });
    const text = completion.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(text);
    teasers = (parsed?.teasers || []).slice(0, 5);
  } catch {
    teasers = [
      { prompt: "What gets wetter the more it dries?" },
      { prompt: "Forward I am heavy, backward I am not. What am I?" },
      { prompt: "I have keys but open no locks. What am I?" },
      { prompt: "I speak without a mouth and hear without ears. What am I?" },
      { prompt: "Taken from a mine, trapped in wood, used by all. What am I?" },
    ];
  }

  const withIds = teasers.map(t => {
    const id = hashId(`${dateStr}:${t.prompt}`);
    return { id, prompt: String(t.prompt || "").trim() };
  });

  mem.byDate.set(dateStr, withIds);
  withIds.forEach(t => mem.byId.set(t.id, { ...t, date: dateStr }));
  saveToDisk(dateStr, withIds);
  return withIds;
}

// GET /api/brainteasers?date=YYYY-MM-DD
router.get("/brainteasers", async (req, res) => {
  try {
    const date = String(req.query.date || "").trim() || new Date().toISOString().slice(0,10);
    const teasers = await generateTeasersForDate(date);
    res.json({ teasers });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Failed to fetch teasers" });
  }
});

// POST /api/brainteasers/check { id, answer }
router.post("/brainteasers/check", express.json(), async (req, res) => {
  try {
    const { id, answer } = req.body || {};
    if (!id || typeof answer !== "string")
      return res.status(400).json({ error: "id and answer required" });

    const item = mem.byId.get(String(id));
    if (!item) return res.status(404).json({ error: "Unknown teaser id" });

    const verifyPrompt = `
You are a strict riddle checker. The riddle is:
"${item.prompt}"

The user's answer is: "${answer}"

Reply ONLY valid JSON like:
{ "correct": true }  OR  { "correct": false }
Be lenient to common synonyms and spelling if the meaning matches.
`;

    let correct = false;
    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          { role: "system", content: "Return only valid JSON. No commentary." },
          { role: "user", content: verifyPrompt },
        ],
      });
      const text = completion.choices?.[0]?.message?.content || "{}";
      const parsed = JSON.parse(text);
      correct = !!parsed?.correct;
    } catch { correct = false; }

    res.json({ correct, award: correct ? 5 : 0 });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Check failed" });
  }
});

module.exports = router;
