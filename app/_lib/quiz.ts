export type AnyCard = { question?: string; answer?: string; front?: string; back?: string } | Record<string, any>;

function qaFrom(card: AnyCard) {
  const q = (card as any)?.question ?? (card as any)?.front;
  const a = (card as any)?.answer ?? (card as any)?.back;
  return q && a ? { question: String(q), answer: String(a) } : null;
}
const shuf = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

export function buildQuiz(cards: AnyCard[], limit = 20) {
  if (!Array.isArray(cards)) return [];
  const qa = cards.map(qaFrom).filter(Boolean) as { question: string; answer: string }[];
  if (!qa.length) return [];
  const pool = shuf(qa);
  const picked = pool.slice(0, Math.min(limit, pool.length));
  return picked.map((c) => {
    const wrong = pool.filter((x) => x.answer !== c.answer).slice(0, 3).map((x) => x.answer);
    const set = new Set<string>([...wrong, c.answer]);
    while (set.size < 4 && set.size < pool.length) {
      set.add(pool[Math.floor(Math.random() * pool.length)].answer);
    }
    const choices = shuf(Array.from(set));
    return { question: c.question, choices, answer: c.answer };
  });
}
