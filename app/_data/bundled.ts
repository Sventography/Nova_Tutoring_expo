// Statically import JSON so Metro/Web *bundle* it for all platforms.
import INDEX_JSON from "./flashcard_index.json";
import BY_ID_JSON from "./flashcards_data_by_id.json";
import BY_TITLE_JSON from "./flashcards_data.json";

// Metro sometimes wraps JSON or not, so unwrap gently:
function unwrap<T>(m: any): T { return m && m.default ? (m.default as T) : (m as T); }

export const INDEX  = unwrap<any[]>(INDEX_JSON)  ?? [];
export const BY_ID  = unwrap<Record<string, any[]>>(BY_ID_JSON) ?? {};
export const BY_TITLE = unwrap<Record<string, any[]>>(BY_TITLE_JSON) ?? {};
