import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import OpenAI from "openai";

dotenv.config({ path: ".env.server" }); // keep your keys here

const PORT = Number(process.env.PORT || 5055);

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })
  : null;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const app = express();
app.use(cors());
app.use(express.json());

// --- Health check
app.get("/health", (_req, res) => res.json({ ok: true }));

// --- Ask endpoint (OpenAI)
app.post("/api/ask", async (req, res) => {
  try {
    if (!openai) return res.status(500).json({ error: "OpenAI not configured" });
    const question = (req.body?.question ?? "").toString().trim();
    if (!question) return res.status(400).json({ error: "Missing question" });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are Nova, a friendly tutoring assistant." },
        { role: "user", content: question }
      ],
      temperature: 0.2
    });

    const answer = completion.choices?.[0]?.message?.content ?? "";
    res.json({ answer });
  } catch (err) {
    console.error("[/api/ask] error:", err);
    res.status(500).json({ error: "OpenAI request failed" });
  }
});

// --- Stripe PaymentIntent
app.post("/api/create-payment-intent", async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: "Stripe not configured" });
    const { amount, currency = "usd" } = req.body as { amount: number; currency?: string };
    if (!amount || amount < 1) return res.status(400).json({ error: "Invalid amount" });

    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true }
    });

    res.json({ clientSecret: pi.client_secret });
  } catch (err) {
    console.error("[/api/create-payment-intent] error:", err);
    res.status(500).json({ error: "Stripe request failed" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Nova server running on http://localhost:${PORT}`);
});
