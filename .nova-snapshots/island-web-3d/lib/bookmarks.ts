import AsyncStorage from "@react-native-async-storage/async-storage";

export type Bookmark = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
};

const KEY = "BOOKMARKS_STORE";

async function load(): Promise<Record<string, Bookmark>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function save(store: Record<string, Bookmark>): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(store));
  } catch {}
}

export async function addBookmark(title: string, content: string): Promise<Bookmark> {
  const store = await load();
  const id = Math.random().toString(36).slice(2);
  const createdAt = new Date().toISOString();
  const b: Bookmark = { id, title, content, createdAt };
  store[id] = b;
  await save(store);
  return b;
}

export async function removeBookmark(id: string): Promise<boolean> {
  const store = await load();
  if (store[id]) {
    delete store[id];
    await save(store);
    return true;
  }
  return false;
}

export async function getBookmark(id: string): Promise<Bookmark | null> {
  const store = await load();
  return store[id] || null;
}

export async function listBookmarks(): Promise<Bookmark[]> {
  const store = await load();
  return Object.values(store);
}

export default { addBookmark, removeBookmark, getBookmark, listBookmarks };
