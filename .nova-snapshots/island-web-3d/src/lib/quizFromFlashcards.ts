import data from "../data/flashcards.json";
export type Card = { q: string; a: string };
export type Topic = { title: string; cards: Card[] };
export type QuizItem = { q: string; choices: string[]; answerIndex: number };
export function getTopics(): string[] {
  return (data.topics || []).map((t: Topic) => t.title);
}
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
export function buildQuiz(topic: string, count = 10): QuizItem[] {
  const topics: Topic[] = data.topics || [];
  const t = topics.find((x) => x.title === topic) || topics[0];
  if (!t) return [];
  const pool = t.cards.slice();
  const take = Math.min(count, pool.length);
  const others = topics
    .flatMap((x) => (x.title === t.title ? [] : x.cards))
    .map((c) => c.a);
  const qs: QuizItem[] = [];
  shuffle(pool)
    .slice(0, take)
    .forEach((c) => {
      const distractors = shuffle(others.slice())
        .filter((a) => a !== c.a)
        .slice(0, 3);
      const choices = shuffle([c.a, ...distractors]);
      qs.push({ q: c.q, choices, answerIndex: choices.indexOf(c.a) });
    });
  return qs;
}
