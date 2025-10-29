import { Router } from "express";
import OpenAI from "openai";

const router = Router();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/ask", async (req, res) => {
  try {
    const question = String(req.body?.question ?? "").slice(0, 2000);
    if (!question) return res.status(400).json({ ok: false, error: "Missing question" });

    // short, safe, study-style response
    const sys = "You are a friendly tutor. Give concise, accurate explanations. Use bullet points when helpful. Avoid code unless requested.";
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: question },
      ],
      temperature: 0.4,
      max_tokens: 450,
    });

    const answer = resp.choices[0]?.message?.content?.trim() || "Sorry, I couldn’t generate an answer.";
    return res.json({ ok: true, answer });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? "Server error" });
  }
});

export default router;
