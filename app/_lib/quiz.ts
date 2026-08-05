// app/_lib/quiz.ts

export type QuizItem = {
  question: string;
  answer: string;
  choices: string[];
};

type RawCard = {
  question?: unknown;
  answer?: unknown;
  front?: unknown;
  back?: unknown;
  q?: unknown;
  a?: unknown;
  term?: unknown;
  definition?: unknown;
};

const FALLBACK_DISTRACTORS = [
  "None of these",
  "Insufficient information",
  "The opposite relationship",
  "A different underlying process",
  "An unrelated definition",
  "A special case only",
  "A reversed cause and effect",
  "A different unit or scale",
  "A false equivalence",
  "A missing required condition",
  "An outdated interpretation",
  "A calculation using the wrong operation",
  "A conclusion not supported by the evidence",
  "A rule applied in the wrong direction",
  "A result from a different topic",
  "A partially correct but incomplete statement",
];

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function normalized(value: unknown): string {
  return clean(value)
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function toPair(card: RawCard): {
  question: string;
  answer: string;
} | null {
  const question = clean(
    card?.question ??
      card?.front ??
      card?.q ??
      card?.term
  );

  const answer = clean(
    card?.answer ??
      card?.back ??
      card?.a ??
      card?.definition
  );

  return question && answer
    ? { question, answer }
    : null;
}

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(
      Math.random() * (index + 1)
    );

    [copy[index], copy[swapIndex]] = [
      copy[swapIndex],
      copy[index],
    ];
  }

  return copy;
}

function uniqueStrings(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const display = clean(value);
    const key = normalized(display);

    if (!display || !key || seen.has(key)) continue;

    seen.add(key);
    result.push(display);
  }

  return result;
}

export function buildQuiz(
  rawCards: readonly RawCard[],
  requestedLength = 20
): QuizItem[] {
  const pairs = (Array.isArray(rawCards)
    ? rawCards
    : []
  )
    .map(toPair)
    .filter(
      (pair): pair is {
        question: string;
        answer: string;
      } => !!pair
    );

  if (!pairs.length) return [];

  const questionCount = Math.max(
    1,
    Math.min(
      Math.floor(requestedLength) || 20,
      pairs.length
    )
  );

  const selectedQuestions = shuffle(pairs).slice(
    0,
    questionCount
  );

  const allTopicAnswers = uniqueStrings(
    pairs.map((pair) => pair.answer)
  );

  return selectedQuestions.map((pair) => {
    const correctKey = normalized(pair.answer);

    // Every question gets a fresh shuffle of every other real answer in
    // the selected topic. This prevents the old repeated three-answer set.
    const realAnswerPool = shuffle(
      allTopicAnswers.filter(
        (answer) =>
          normalized(answer) !== correctKey
      )
    );

    const fallbackPool = shuffle(
      FALLBACK_DISTRACTORS.filter(
        (answer) =>
          normalized(answer) !== correctKey
      )
    );

    const distractors = uniqueStrings([
      ...realAnswerPool,
      ...fallbackPool,
    ]).slice(0, 3);

    const choices = shuffle(
      uniqueStrings([
        pair.answer,
        ...distractors,
      ])
    );

    return {
      question: pair.question,
      answer: pair.answer,
      choices,
    };
  });
}

export default buildQuiz;
