// app/_lib/cards.ts
// Small, resilient helpers for topic -> quiz cards.

export type QuizOption = { text: string; correct: boolean };
export type QuizItem = { prompt: string; options: QuizOption[] };

// Try to use getCardsByTopic from topics.ts if available
let _getCardsByTopic: ((topicId: string) => any[]) | null = null;
try {
  const mod = require("./topics");
  _getCardsByTopic = mod?.getCardsByTopic ?? null;
} catch {}

// Fallback tiny sets if topics.ts isn't present or returns empty
const FALLBACK: Record<string, QuizItem[]> = {
  math: [
    { prompt: "2 + 2 = ?", options: [{ text: "3", correct: false }, { text: "4", correct: true }, { text: "5", correct: false }] },
  ],
  science: [
    { prompt: "H₂O is…", options: [{ text: "Water", correct: true }, { text: "Oxygen", correct: false }, { text: "Hydrogen", correct: false }] },
  ],
};

export function getCardsByTopic(topicId: string): QuizItem[] {
  const id = String(topicId || "").toLowerCase();
  if (_getCardsByTopic) {
    try {
      const raw = _getCardsByTopic(id) || [];
      if (Array.isArray(raw) && raw.length) return coerceToQuiz(raw);
    } catch {}
  }
  return FALLBACK[id] || [];
}

export function coerceToQuiz(arr: any[]): QuizItem[] {
  // Accept different shapes and coerce to QuizItem
  return arr.map((it: any) => {
    if (typeof it === "string") {
      return { prompt: it, options: [{ text: "OK", correct: true }] } as QuizItem;
    }
    const prompt = String(it.prompt ?? it.question ?? it.q ?? it.text ?? "Untitled");
    let options: QuizOption[] = [];
    if (Array.isArray(it.options)) {
      options = it.options.map((o: any) => ({ text: String(o.text ?? o), correct: !!o.correct }));
    } else if (it.answer) {
      const ans = String(it.answer);
      options = [ans, it.wrong1, it.wrong2, it.wrong3]
        .filter(Boolean)
        .map((t: any, i: number) => ({ text: String(t), correct: i === 0 }));
    } else {
      options = [{ text: "OK", correct: true }];
    }
    return { prompt, options } as QuizItem;
  });
}

export function shuffle<T>(a: T[]): T[] {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
