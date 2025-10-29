/**
 * Bulletproof 20-card adapter for Flashcards tab.
 * - Normalizes various card shapes to {front, back, id}
 * - Returns exactly 20 cards (shuffled); pads if fewer
 * - Exposes getTopics + searchTopics using your flashcards source
 */
type Topic = { id: string; title: string };
export type Card = { id?: string|number; front: string; back: string };

function shuffle<T>(a: T[]): T[] { return a.sort(() => Math.random() - 0.5); }

function normalizeCard(x: any, i: number): Card | null {
  if (!x) return null;
  const front =
    x.front ?? x.question ?? x.q ?? x.term ?? x.word ?? x.title ?? x.prompt ?? null;
  const back =
    x.back ?? x.answer ?? x.a ?? x.definition ?? x.explanation ?? x.response ?? null;
  if (!front || !back) return null;
  return { id: x.id ?? i, front: String(front), back: String(back) };
}

function safeGetFlashcardsMod(): any {
  try { return require("./flashcards"); } catch { return {}; }
}

export function getTopics(): Topic[] {
  const mod = safeGetFlashcardsMod();
  // Prefer an exported getTopics(), else try a topics list
  try {
    const list = (mod.getTopics?.() ?? mod.topics ?? []) as any[];
    return (list || []).map((t, i) => ({
      id: String(t.id ?? t.slug ?? t.key ?? i),
      title: String(t.title ?? t.name ?? t.label ?? `Topic ${i+1}`),
    }));
  } catch { return []; }
}

export function searchTopics(q: string): Topic[] {
  const needle = (q || "").toLowerCase().trim();
  if (!needle) return getTopics();
  return getTopics().filter(t =>
    t.title.toLowerCase().includes(needle) || t.id.toLowerCase().includes(needle)
  );
}

export function getTwentyCardsById(topicId: string): Card[] {
  const mod = safeGetFlashcardsMod();
  let raw: any[] = [];
  try { raw = mod.getCardsById?.(topicId) ?? []; } catch { raw = []; }

  // Normalize shapes to {front, back}
  const norm = (raw || []).map(normalizeCard).filter(Boolean) as Card[];

  if (norm.length === 0) return [];

  // Shuffle and pick/pad to exactly 20
  const pool = shuffle([...norm]);
  const out: Card[] = [];

  if (pool.length >= 20) {
    return pool.slice(0, 20);
  }

  // Pad by cycling through pool, avoid same card twice in a row if possible
  let i = 0;
  while (out.length < 20) {
    const next = pool[i % pool.length];
    if (out.length === 0 || out[out.length - 1].front !== next.front) {
      out.push(next);
    } else {
      // pick a different one if available
      const alt = pool.find(c => c.front !== next.front) ?? next;
      out.push(alt);
    }
    i++;
  }
  return out;
}
