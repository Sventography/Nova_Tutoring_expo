import AsyncStorage from "@react-native-async-storage/async-storage";

export type Flashcard = {
  id: string;
  front: string;
  back: string;
  topic?: string;
};
export type CollectionsState = {
  collections: Record<string, Flashcard[]>;
  order: string[];
};

const K = "flashcards.collections";

async function load(): Promise<CollectionsState> {
  const raw = await AsyncStorage.getItem(K);
  if (!raw) return { collections: {}, order: [] };
  try {
    return JSON.parse(raw) as CollectionsState;
  } catch {
    return { collections: {}, order: [] };
  }
}

async function save(state: CollectionsState) {
  await AsyncStorage.setItem(K, JSON.stringify(state));
}

export async function listCollections() {
  const s = await load();
  return s.order.map((name) => ({
    name,
    count: s.collections[name]?.length || 0,
  }));
}

export async function getCollection(name: string) {
  const s = await load();
  return s.collections[name] || [];
}

export async function addToCollection(name: string, card: Flashcard) {
  const s = await load();
  if (!s.collections[name]) {
    s.collections[name] = [];
    if (!s.order.includes(name)) s.order.push(name);
  }
  if (!s.collections[name].some((c) => c.id === card.id)) {
    s.collections[name].push(card);
    await save(s);
    return true;
  }
  return false;
}

export async function removeFromCollection(name: string, cardId: string) {
  const s = await load();
  if (!s.collections[name]) return false;
  const before = s.collections[name].length;
  s.collections[name] = s.collections[name].filter((c) => c.id !== cardId);
  await save(s);
  return s.collections[name].length !== before;
}

export async function renameCollection(oldName: string, newName: string) {
  if (!newName || newName === oldName) return false;
  const s = await load();
  if (!s.collections[oldName]) return false;
  if (s.collections[newName]) return false;
  s.collections[newName] = s.collections[oldName];
  delete s.collections[oldName];
  s.order = s.order.map((n) => (n === oldName ? newName : n));
  await save(s);
  return true;
}

export async function deleteCollection(name: string) {
  const s = await load();
  if (!s.collections[name]) return false;
  delete s.collections[name];
  s.order = s.order.filter((n) => n !== name);
  await save(s);
  return true;
}
