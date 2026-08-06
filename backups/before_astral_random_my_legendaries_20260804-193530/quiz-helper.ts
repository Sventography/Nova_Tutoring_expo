// app/_lib/quiz.ts

export type AnyCard =
  | { question?: string; answer?: string; front?: string; back?: string }
  | Record<string, any>;

// Turn any card into a simple {question, answer} pair
function qaFrom(card: AnyCard) {
  const q = (card as any)?.question ?? (card as any)?.front;
  const a = (card as any)?.answer ?? (card as any)?.back;
  return q && a ? { question: String(q), answer: String(a) } : null;
}

const shuf = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

function uniqStrings(xs: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of xs) {
    const k = String(x ?? "").trim();
    if (!k) continue;
    const kk = k.toLowerCase();
    if (seen.has(kk)) continue;
    seen.add(kk);
    out.push(k);
  }
  return out;
}

/**
 * Global distractor bank so the wrong answers aren't just
 * "other real answers slightly shuffled".
 */
const DISTRACTOR_BANK: string[] = [
  "Incorrect transformation",
  "Unrelated definition",
  "Misapplied rule",
  "Opposite relationship",
  "Not defined in this context",
  "Unverified assumption",
  "Contradictory statement",
  "Irrelevant detail",
  "Incomplete explanation",
  "Inconsistent example",
  "Wrong comparison",
  "Misread notation",
  "False equivalence",
  "Reversed cause and effect",
  "Ignored key condition",
  "Approximation only",
  "Out of domain",
  "Misaligned units",
  "Calculation shortcut error",
  "Reordered steps incorrectly",
  "Confused variables",
  "Swapped numerator and denominator",
  "Used wrong operation",
  "Misplaced decimal",
  "Rounded too early",
  "Ignored negative sign",
  "Incorrect base case",
  "Wrong boundary value",
  "Overgeneralization",
  "Special case only",
  "Does not always hold",
  "Ambiguous statement",
  "Undefined for this input",
  "Not supported by data",
  "Uses the wrong symbol",
  "Contradicts earlier step",
  "Not logically necessary",
  "Extra term added",
  "Missing required term",
  "Mixed up order of operations",
  "Off by one error",
  "Assumes symmetry incorrectly",
  "Confuses correlation and causation",
  "Reversed inequality",
  "Treats estimate as exact",
  "Uses outdated definition",
  "Applies rule to wrong side",
  "Combines unlike terms",
  "Uses wrong reference point",
  "Ignores direction",
  "Not scaled correctly",
  "Treats variable as constant",
  "Mislabels the result",
  "Incorrect simplification",
  "Wrong domain assumption",
  "Applies 2D rule to 3D case",
  "Swapped independent and dependent",
  "Not normalized",
  "Missing justification",
  "Conclusion does not follow",
  "Reverses hypothesis and result",
  "Applies rule backwards",
  "Uses wrong formula family",
  "Treats example as proof",
  "Assumes linear when not",
  "Incorrect sign convention",
  "Misinterprets diagram",
  "Partial result only",
  "Leaves out constraints",
  "Overlooks special values",
  "Uses incompatible units",
  "Ignores remainder",
  "Not reduced to simplest form",
  "Confuses area and perimeter",
  "Incorrect factorization",
  "Wrong substitution",
  "Confuses mean and median",
  "Misreads percentage",
  "Uses sample as population",
  "Wrong reference frame",
  "Breaks conservation rule",
  "Not invariant under change",
  "Applies property to sum incorrectly",
  "Drops absolute value",
  "Flips fraction incorrectly",
  "Assumes zero where not given",
  "Treats discrete as continuous",
  "Misreads exponent",
  "Incorrect limit behavior",
  "Chooses wrong axis",
  "Out of order reasoning",
  "Not enough information",
  "Applies pattern where none exists",
  "Forgets initial condition",
  "Ignores edge cases",
  "Treats guess as proof",
  "Uses wrong coordinate system",
];

function pickDistractors(
  correct: string,
  allAnswers: string[],
  count: number
): string[] {
  const out: string[] = [];
  const used = new Set<string>();
  const correctNorm = String(correct || "").trim().toLowerCase();

  if (correctNorm) used.add(correctNorm);

  const pushIfFresh = (label: string) => {
    const k = String(label || "").trim();
    if (!k) return;
    const kk = k.toLowerCase();
    if (kk === correctNorm) return;
    if (used.has(kk)) return;
    used.add(kk);
    out.push(k);
  };

  // 1) Other real answers from this topic
  shuf(allAnswers).forEach((a) => {
    if (out.length >= count) return;
    pushIfFresh(a);
  });

  // 2) Global distractor bank
  shuf(DISTRACTOR_BANK).forEach((label) => {
    if (out.length >= count) return;
    pushIfFresh(label);
  });

  // 3) Safety padding if still not enough
  while (out.length < count) {
    pushIfFresh(`Option ${out.length + 1}`);
    if (out.length >= count) break;
  }

  return out.slice(0, count);
}

export function buildQuiz(cards: AnyCard[], limit = 20) {
  if (!Array.isArray(cards)) return [];

  const qa = cards
    .map(qaFrom)
    .filter(Boolean) as { question: string; answer: string }[];

  if (!qa.length) return [];

  const pool = shuf(qa);
  const picked = pool.slice(0, Math.min(limit, pool.length));

  const allAnswers = uniqStrings(pool.map((p) => p.answer));

  return picked.map((c) => {
    const correct = c.answer;
    const distractors = pickDistractors(correct, allAnswers, 3);

    // ensure we keep everything unique and include the correct answer
    let choices = uniqStrings([correct, ...distractors]);

    // if something weird happens and correct fell out, force it in
    if (!choices.some((x) => x.toLowerCase() === correct.toLowerCase())) {
      choices = uniqStrings([correct, ...choices]);
    }

    // cap at 4 choices and shuffle
    choices = shuf(choices).slice(0, 4);

    return {
      question: c.question,
      choices,
      answer: correct,
    };
  });
}
