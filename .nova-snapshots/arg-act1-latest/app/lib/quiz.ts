import { getCardsByTopic, topics } from "../_lib/topics";

export type QuizOption = { text: string; correct: boolean };
export type QuizItem = { prompt: string; options: QuizOption[] };

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildQuizFromCards(topic: string, count = 20): QuizItem[] {
  const cards = getCardsByTopic(topic);
  if (!cards.length) return [];
  const allAnswers = Array.from(new Set(cards.map((c) => c.back)));
  const selected = cards.slice(0, count);
  return selected.map((card) => {
    const correct = card.back;
    const distractors = shuffle(allAnswers.filter((a) => a !== correct)).slice(0, 3);
    const options = shuffle([
      { text: correct, correct: true },
      ...distractors.map((d) => ({ text: d, correct: false })),
    ]);
    return { prompt: card.front, options };
  });
}

