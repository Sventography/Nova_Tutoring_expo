import { INDEX, BY_ID, BY_TITLE } from "./flashcards.data";

export type Topic = { id: string; title: string; group: string; count: number };
export type Card  = { front: string; back: string };

export function getTopics(): Topic[] {
  return (INDEX as Topic[]) ?? [];
}

export function normalizeCard(x: any): Card | null {
  if (!x) return null;
  if (Array.isArray(x)) {
    if (x.length >= 2) return { front: String(x[0] ?? ""), back: String(x[1] ?? "") };
    if (x.length === 1)   return { front: String(x[0] ?? ""), back: "" };
    return null;
  }
  const front = x.front ?? x.term ?? x.prompt ?? x.q ?? x.question ?? x.word ?? x.cardFront ?? x.left ?? x.text ?? "";
  const back  = x.back  ?? x.definition ?? x.answer ?? x.a ?? x.explanation ?? x.cardBack ?? x.right ?? x.resp ?? x.response ?? "";
  const f = String(front ?? "").trim();
  const b = String(back  ?? "").trim();
  if (!f && !b) return null;
  return { front: f, back: b };
}

export function getCardsById(topicId: string): Card[] {
  const idArr = Array.isArray((BY_ID as any)[topicId]) ? (BY_ID as any)[topicId] : null;
  if (idArr) {
    const out = idArr.map(normalizeCard).filter(Boolean) as Card[];
    if (out.length) return out;
  }
  const t = getTopics().find(x => x.id === topicId);
  if (t) {
    const titleArr = Array.isArray((BY_TITLE as any)[t.title]) ? (BY_TITLE as any)[t.title] : null;
    if (titleArr) return (titleArr.map(normalizeCard).filter(Boolean) as Card[]);
  }
  return [];
}
