import flashcards from "../_data/flashcard_index.json";

export type Topic = { id: string; title: string; count: number; questions: any[] };

// Normalizes flashcards JSON into a consistent array of topics
export function getTopics(): Topic[] {
  if (Array.isArray(flashcards)) {
    return flashcards.map((t: any, i: number) => ({
      id: t.id ?? String(i),
      title: t.title ?? `Topic ${i + 1}`,
      count: t.questions ? t.questions.length : 0,
      questions: t.questions ?? [],
    }));
  } else {
    return Object.keys(flashcards).map((k) => ({
      id: k,
      title:
        flashcards[k]?.title ??
        k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, " "),
      count: Array.isArray(flashcards[k]) ? flashcards[k].length : 0,
      questions: Array.isArray(flashcards[k]) ? flashcards[k] : [],
    }));
  }
}
