import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/ask" });
}

export async function POST(req: Request) {
  try {
    const { question } = await req.json();
    if (!question) return NextResponse.json({ error: "No question provided" }, { status: 400 });

    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: "You are Nova, Eric’s helpful tutor and partner." },
        { role: "user", content: question },
      ],
    });

    const answer = r.choices?.[0]?.message?.content ?? "Sorry — I couldn't generate a response.";
    return NextResponse.json({ answer });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Something went wrong" }, { status: 500 });
  }
}
