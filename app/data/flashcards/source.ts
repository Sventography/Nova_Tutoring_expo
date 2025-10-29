export type QA = { q: string; a: string; choices?: string[] };
export type TopicIndex = { id: string; title: string; group: string; count: number };

// These two files are produced by your build script already:
import INDEX from "../../_data/flashcard_index.json";
import DATA from "../../_data/flashcards_data.json";

const INDEX_LIST = (INDEX as TopicIndex[]).slice().sort((a,b)=>a.title.localeCompare(b.title));
const DATA_BY_TITLE = DATA as Record<string, any[]>;

/** convert whatever JSON shape → { q, a } */
export function toQA(obj: any): QA {
  const q = obj?.q ?? obj?.front ?? obj?.term ?? obj?.prompt ?? "";
  const a = obj?.a ?? obj?.back ?? obj?.definition ?? obj?.answer ?? "";
  const choices = Array.isArray(obj?.choices) ? obj.choices : undefined;
  return { q: String(q), a: String(a), choices };
}

const DATA_BY_ID: Record<string, QA[] | undefined> = {};
for (const t of INDEX_LIST) {
  const raw = DATA_BY_TITLE[t.title];
  if (raw) DATA_BY_ID[t.id] = raw.map(toQA);
}

export function getTopics(): TopicIndex[] { return INDEX_LIST; }

export function getCardsForTopic(t?: TopicIndex): QA[] {
  if (!t) return [];
  const byTitle = DATA_BY_TITLE[t.title]?.map(toQA);
  if (byTitle?.length) return byTitle;
  return DATA_BY_ID[t.id] ?? [];
}

export function searchTopics(q: string, limit = 30): TopicIndex[] {
  const s = q.trim().toLowerCase();
  if (!s) return INDEX_LIST.slice(0, limit);
  const starts: TopicIndex[] = [], contains: TopicIndex[] = [];
  for (const t of INDEX_LIST) {
    const ttl = t.title.toLowerCase();
    if (ttl.startsWith(s)) starts.push(t);
    else if (ttl.includes(s)) contains.push(t);
    if ((starts.length + contains.length) >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}
