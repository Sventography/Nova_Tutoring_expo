export async function askNova(prompt: string, systemHint?: string): Promise<string> {
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!key) throw new Error("Missing EXPO_PUBLIC_OPENAI_API_KEY");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: systemHint ?? "You are Nova, a warm, encouraging tutor. Be concise and helpful." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return (json?.choices?.[0]?.message?.content || "").toString().trim()
      || "Sorry — I couldn't generate a response.";
}
