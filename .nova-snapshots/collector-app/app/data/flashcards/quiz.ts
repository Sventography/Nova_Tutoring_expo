import type { QA } from "./source";

/** One multiple-choice question */
export type MCQ = {
  q: string;
  options: string[];  // shuffled
  correctIndex: number;
  source: QA;         // original card
};

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Take cards, make MCQs. If a card has .choices, we respect them; otherwise synthesize 3 distractors. */
export function buildQuiz(cards: QA[], max = 20): MCQ[] {
  const pool = cards.slice();
  shuffle(pool);
  const pick = pool.slice(0, Math.min(max, pool.length));

  // for synthesized options, use other answers in the set
  const allAnswers = Array.from(new Set(cards.map(c => String(c.a).trim()).filter(Boolean)));

  const out: MCQ[] = [];
  for (const c of pick) {
    const correct = String(c.a ?? "").trim();
    let options: string[] = [];

    if (Array.isArray(c.choices) && c.choices.length >= 2) {
      // Use provided choices; ensure the correct answer is in there
      const raw = Array.from(new Set(c.choices.map(x => String(x))));
      if (!raw.includes(correct)) raw.push(correct);
      options = shuffle(raw.slice());
    } else {
      // Synthesize 3 wrong answers from the pool
      const wrongs: string[] = [];
      const candidates = shuffle(allAnswers.filter(a => a && a !== correct).slice());
      for (const a of candidates) {
        if (wrongs.length >= 3) break;
        // avoid near-duplicates
        if (!wrongs.some(w => w.toLowerCase() === a.toLowerCase())) wrongs.push(a);
      }
      while (wrongs.length < 3) wrongs.push(`(none of the above ${wrongs.length+1})`);
      options = shuffle([correct, ...wrongs.slice(0, 3)]);
    }

    const correctIndex = options.findIndex(x => x === correct);
    out.push({ q: String(c.q ?? ""), options, correctIndex: Math.max(0, correctIndex), source: c });
  }

  return out;
}
