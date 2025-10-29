import { INDEX, DATA, type TopicIndex } from "../_data/index";

export type QA = { q: string; a: string; choices?: string[] };

function toQA(obj: any): QA {
  const q = obj?.q ?? obj?.front ?? obj?.term ?? obj?.prompt ?? "";
  const a = obj?.a ?? obj?.back ?? obj?.definition ?? obj?.answer ?? "";
  const choices = Array.isArray(obj?.choices) ? obj.choices : undefined;
  return { q: String(q), a: String(a), ...(choices ? { choices } : {}) };
}
const slug = (s:string) => String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

const INDEX_LIST: TopicIndex[] = (Array.isArray(INDEX)?INDEX:[]).slice().sort((a,b)=>a.title.localeCompare(b.title));
const DATA_BY_TITLE: Record<string, any[]> = (DATA && typeof DATA === "object") ? DATA : {};

const DATA_BY_ID: Record<string, QA[] | undefined> = {};
for (const t of INDEX_LIST) {
  const raw = DATA_BY_TITLE[t.title];
  if (raw) DATA_BY_ID[t.id] = raw.map(toQA);
}

// ---- Public API (current names)
export function getTopics(): TopicIndex[] { return INDEX_LIST; }
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
export function getCardsForTopic(t?: TopicIndex): QA[] {
  if (!t) return [];
  const byTitle = DATA_BY_TITLE[t.title]?.map(toQA);
  if (byTitle?.length) return byTitle;
  return DATA_BY_ID[t.id] ?? [];
}

// ---- Aliases for older code (to prevent blank screens)
export function getTopicById(id: string): TopicIndex | undefined {
  return INDEX_LIST.find(t => t.id === id || slug(t.title) === id);
}
export function getCardsById(id: string): QA[] {
  const topic = getTopicById(id);
  if (!topic) return [];
  return getCardsForTopic(topic);
}

// Dev sanity log
if (typeof __DEV__ !== "undefined" && __DEV__) {
  try {
    // eslint-disable-next-line no-console
    console.log("[flashcards] topics:", INDEX_LIST.length, "| data keys:", Object.keys(DATA_BY_TITLE||{}).length);
  } catch {}
}
