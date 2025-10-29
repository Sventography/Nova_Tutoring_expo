// app/data/topics.ts
export type Card = { front: string; back: string };
export type QuizQ = { q: string; options: string[]; a: number };
export type Topic = { id: string; title: string; cards: Card[]; quiz?: QuizQ[] };

const FALLBACK: Topic[] = [
  {
    id: "einstein",
    title: "Einstein Basics",
    cards: [
      { front: "E=mc² relates?", back: "Energy equals mass × c²." },
      { front: "Symbol c means?", back: "Speed of light in vacuum." },
    ],
    quiz: [
      { q: "What does E=mc² relate?", a: 0, options: ["Energy & mass", "Force & time", "Speed & gravity", "Charge & spin"] },
      { q: "Speed of light symbol?", a: 1, options: ["v", "c", "λ", "μ"] },
    ],
  },
];

export function loadTopics(): Topic[] {
  try {
    // JSON is side-by-side at app/data/topics.json
    // Using require() keeps this working without tsconfig JSON tweaks.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const data = require("./topics.json");
    if (Array.isArray(data)) return data as Topic[];
  } catch {}
  return FALLBACK;
}

export function getTopicById(id?: string | null) {
  const list = loadTopics();
  return list.find(t => t.id === id) || list[0];
}

export function searchTopics(q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return loadTopics();
  return loadTopics().filter(t =>
    t.title.toLowerCase().includes(s) || t.id.toLowerCase().includes(s)
  );
}
