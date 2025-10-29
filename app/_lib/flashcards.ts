export type Card = { question?: string; answer?: string; front?: string; back?: string };
export type TopicMeta = { id: string; title: string; count: number };

// Expo/Metro supports importing JSON directly.
import data from "./topics-data.json";

function toQA(card: Card) {
  const q = (card.question ?? card.front)?.toString();
  const a = (card.answer ?? card.back)?.toString();
  return q && a ? { question: q, answer: a } : null;
}

const TOPICS = (data as any)?.topics ?? [];
const MAP: Record<string, { title: string; cards: Card[] }> = {};
for (const t of TOPICS) {
  if (t?.id && t?.title && Array.isArray(t?.cards)) MAP[t.id] = { title: t.title, cards: t.cards };
}

export function getTopics(): TopicMeta[] {
  return Object.entries(MAP).map(([id, v]) => ({ id, title: v.title, count: (v.cards ?? []).length }));
}

export function getCardsById(id: string): Card[] {
  return MAP[id]?.cards ?? [];
}

// Re-export for quiz helper compatibility
export { toQA };
