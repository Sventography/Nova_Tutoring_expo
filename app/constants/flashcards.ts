export type Flashcard = { id: string; q: string; a: string };
export type Topic = { id: string; title: string; cards: Flashcard[] };

export const FLASHCARDS: Topic[] = [
  {
    id: "algebra_basics",
    title: "Algebra Basics",
    cards: [
      { id: "a1", q: "Solve: 2x + 6 = 10", a: "x = 2" },
      { id: "a2", q: "What is the slope in y = 3x + 1?", a: "3" },
      { id: "a3", q: "Distribute: 3(2x + 5)", a: "6x + 15" }
    ]
  }
];

export function getTopicById(id: string): Topic | undefined {
  return FLASHCARDS.find(t => t.id === id);
}
