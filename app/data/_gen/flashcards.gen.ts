/* AUTO-GENERATED — manual hotfix */
export type Card = { q: string; a: string };

// ✅ Import JSONs directly
import abstract_algebra_intro from "../flashcards/abstract_algebra_intro.json";
import ap_biology from "../flashcards/ap_biology.json";
// …add more imports for now (or regenerate automatically)

export const DATA_MAP: Record<string, Card[]> = {
  "Abstract Algebra (Intro)": (abstract_algebra_intro as any).cards,
  "AP Biology": (ap_biology as any).cards,
};

export const INDEX = [
  { id: "Abstract Algebra (Intro)", title: "Abstract Algebra (Intro)", group: "Math", count: (abstract_algebra_intro as any).cards.length },
  { id: "AP Biology", title: "AP Biology", group: "Science", count: (ap_biology as any).cards.length },
];

export const TOPICS = INDEX.map(t => t.title);
