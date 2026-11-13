export async function handleAskSubmit(q: string): Promise<string> {
  const base = process.env.EXPO_PUBLIC_API_URL;
  if (base) {
    try {
      const r = await fetch(`${base.replace(/\/$/, '')}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q }),
      });
      if (!r.ok) throw new Error("bad status");
      const data = await r.json();
      if (typeof data.answer === "string" && data.answer.length) return data.answer;
    } catch (_) {}
  }
  return `Okay, here’s a quick thought: “${q}” is a great question. I’d start by breaking it into 2–3 parts and tackling each with examples. Want me to outline that?`;
}
