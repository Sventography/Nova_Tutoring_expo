import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { journalStorageKey, journalDraftKey, type JournalScope, type JournalNote } from "./journalModel";

type Pending = { id: string; op: "save"; note: JournalNote } | { id: string; op: "delete" };
type Store = { notes: JournalNote[]; pending: Pending[] };
export type JournalResult = { notes: JournalNote[]; pending: number; syncFailed: boolean };
const queues = new Map<string, Promise<unknown>>();
function serial<T>(key: string, task: () => Promise<T>): Promise<T> {
  const next = (queues.get(key) ?? Promise.resolve()).catch(() => undefined).then(task);
  queues.set(key, next);
  void next.finally(() => { if (queues.get(key) === next) queues.delete(key); }).catch(() => undefined);
  return next;
}
async function read(owner: JournalScope): Promise<Store> {
  const raw = await AsyncStorage.getItem(journalStorageKey(owner));
  if (!raw) return { notes: [], pending: [] };
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.notes) || !Array.isArray(parsed.pending)) throw Error("Journal data is invalid.");
  return parsed;
}
const write = (owner: JournalScope, store: Store) => AsyncStorage.setItem(journalStorageKey(owner), JSON.stringify(store));
function result(store: Store, syncFailed = false): JournalResult {
  return { notes: store.notes, pending: store.pending.length, syncFailed };
}
function toRow(owner: string, note: JournalNote) {
  return { user_id: owner, id: note.id, title: note.title, subject: note.subject, body: note.body,
    pinned: note.pinned, created_at: note.createdAt, updated_at: note.updatedAt };
}
function fromRow(row: any): JournalNote {
  return { id: row.id, title: row.title, subject: row.subject, body: row.body, pinned: row.pinned,
    createdAt: row.created_at, updatedAt: row.updated_at };
}
async function sync(owner: JournalScope, store: Store): Promise<JournalResult> {
  if (!owner) return result(store);
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || data.session?.user.id !== owner) return result(store, true);
    // Each acknowledged operation is removed from durable storage before the next one.
    // Retrying after a connection failure is safe because ids are stable and deletes are idempotent.
    while (store.pending.length) {
      const change = store.pending[0];
      const response = change.op === "save"
        ? await supabase.from("journal_notes").upsert(toRow(owner, change.note), { onConflict: "user_id,id" })
        : await supabase.from("journal_notes").delete().eq("user_id", owner).eq("id", change.id);
      if (response.error) throw response.error;
      const next = { ...store, pending: store.pending.slice(1) };
      await write(owner, next);
      store = next;
    }
    const remote: JournalNote[] = [];
    for (let start = 0; ; start += 200) {
      const { data: rows, error: fetchError } = await supabase.from("journal_notes")
        .select("id,title,subject,body,pinned,created_at,updated_at")
        .eq("user_id", owner).order("id").range(start, start + 199);
      if (fetchError) throw fetchError;
      remote.push(...(rows ?? []).map(fromRow));
      if (!rows || rows.length < 200) break;
    }
    const next = { notes: remote, pending: [] };
    await write(owner, next);
    return result(next);
  } catch {
    // Local edits remain durable; never replace them with an empty list on a network error.
    return result(store, true);
  }
}
export function loadJournalLocal(owner: JournalScope): Promise<JournalResult> {
  return serial(journalStorageKey(owner), async () => result(await read(owner)));
}
export function syncJournal(owner: JournalScope): Promise<JournalResult> {
  return serial(journalStorageKey(owner), async () => sync(owner, await read(owner)));
}
export function saveJournalNote(owner: JournalScope, note: JournalNote): Promise<JournalResult> {
  return serial(journalStorageKey(owner), async () => {
    const store = await read(owner);
    const next: Store = { notes: [note, ...store.notes.filter(n => n.id !== note.id)],
      pending: owner ? [...store.pending.filter(p => p.id !== note.id), { id: note.id, op: "save", note }] : [] };
    await write(owner, next);
    return result(next);
  });
}
export function deleteJournalNote(owner: JournalScope, id: string): Promise<JournalResult> {
  return serial(journalStorageKey(owner), async () => {
    const store = await read(owner);
    const next: Store = { notes: store.notes.filter(n => n.id !== id),
      pending: owner ? [...store.pending.filter(p => p.id !== id), { id, op: "delete" }] : [] };
    await write(owner, next);
    return result(next);
  });
}
export const readJournalDraft = async (owner: JournalScope): Promise<JournalNote | null> => {
  const raw = await AsyncStorage.getItem(journalDraftKey(owner));
  return raw ? JSON.parse(raw) : null;
};
export function writeJournalDraft(owner: JournalScope, note: JournalNote | null): Promise<void> {
  return serial(journalDraftKey(owner), () => note
    ? AsyncStorage.setItem(journalDraftKey(owner), JSON.stringify(note))
    : AsyncStorage.removeItem(journalDraftKey(owner)));
}
