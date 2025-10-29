import { getJSON, setJSON } from "./storage";

export type FlashcardMinimal = { id: string; front?: string; back?: string };
export type Collection = {
  id: string;
  title: string;
  createdAt: string;
  items: FlashcardMinimal[];
};

const KEY = "COLLECTIONS_STORE";

async function load(): Promise<Record<string, Collection>> {
  const data = await getJSON<Record<string, Collection>>(KEY);
  return data || {};
}

async function save(store: Record<string, Collection>) {
  await setJSON(KEY, store);
}

export async function listCollections(): Promise<Collection[]> {
  const store = await load();
  return Object.values(store);
}

export async function getCollection(id: string): Promise<Collection | null> {
  const store = await load();
  return store[id] || null;
}

export async function createCollection(title: string): Promise<Collection> {
  const store = await load();
  const id = Math.random().toString(36).slice(2);
  const col: Collection = { id, title, createdAt: new Date().toISOString(), items: [] };
  store[id] = col;
  await save(store);
  return col;
}

export async function renameCollection(id: string, title: string): Promise<boolean> {
  const store = await load();
  if (!store[id]) return false;
  store[id].title = title;
  await save(store);
  return true;
}

export async function deleteCollection(id: string): Promise<boolean> {
  const store = await load();
  if (!store[id]) return false;
  delete store[id];
  await save(store);
  return true;
}

export async function addToCollection(collectionId: string, card: FlashcardMinimal): Promise<boolean> {
  const store = await load();
  const col = store[collectionId];
  if (!col) return false;
  const exists = col.items.findIndex(i => i.id === card.id) !== -1;
  if (exists) return true;
  col.items.push({ id: card.id, front: card.front, back: card.back });
  await save(store);
  return true;
}

export async function removeFromCollection(collectionId: string, cardId: string): Promise<boolean> {
  const store = await load();
  const col = store[collectionId];
  if (!col) return false;
  const before = col.items.length;
  col.items = col.items.filter(i => i.id !== cardId);
  const changed = col.items.length !== before;
  if (changed) await save(store);
  return changed;
}

export async function toggleInCollection(collectionId: string, card: FlashcardMinimal): Promise<"added"|"removed"|"noop"> {
  const store = await load();
  const col = store[collectionId];
  if (!col) return "noop";
  const idx = col.items.findIndex(i => i.id === card.id);
  if (idx === -1) {
    col.items.push({ id: card.id, front: card.front, back: card.back });
    await save(store);
    return "added";
  } else {
    col.items.splice(idx, 1);
    await save(store);
    return "removed";
  }
}

export async function hasInCollection(collectionId: string, cardId: string): Promise<boolean> {
  const store = await load();
  const col = store[collectionId];
  if (!col) return false;
  return col.items.some(i => i.id === cardId);
}

export default {
  listCollections,
  getCollection,
  createCollection,
  renameCollection,
  deleteCollection,
  addToCollection,
  removeFromCollection,
  toggleInCollection,
  hasInCollection,
};
