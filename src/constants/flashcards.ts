export type QA = { q: string; a: string };
export const FLASHCARD_TOPICS = [{ key:"algebra", title:"Algebra" }, { key:"bio", title:"Biology" }];
export const TOPIC_PACKS = FLASHCARD_TOPICS;
export async function loadFlashcards(_key?: string){ return [{ q:"What is 2+2?", a:"4" }]; }
