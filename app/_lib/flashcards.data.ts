/**
 * Packs JSON into the bundle so web doesn't need fetch()/static hosting.
 * Works on native + web.
 */
import INDEX_RAW from "../_data/flashcard_index.json";
import BY_ID_RAW from "../_data/flashcards_data_by_id.json";
import BY_TITLE_RAW from "../_data/flashcards_data.json";

function unwrap<T>(m: any): T { return (m && m.default) ? m.default as T : (m as T); }

export const INDEX = unwrap<any[]>(INDEX_RAW) ?? [];
export const BY_ID = unwrap<Record<string, any[]>>(BY_ID_RAW) ?? {};
export const BY_TITLE = unwrap<Record<string, any[]>>(BY_TITLE_RAW) ?? {};
