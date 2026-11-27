export type CollectionCard = { id: string; front: string; back: string };
export type CollectionTopic = { id: string; title: string; cards: CollectionCard[] };
type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export function collectionKey(ready: boolean, sessionId: string | null, profileId: string | null) {
  if (!ready || sessionId !== profileId) return null;
  return "@nova/collections/v2/" + (sessionId ? "account/" + encodeURIComponent(sessionId) : "guest");
}

// Serialize reads with writes for this owner, including a quick sign-out and return.
// The old shared storage has no author identity. Leave it intact and unassigned.
export function createCollectionStore(storage: Storage) {
  const pending = new Map<string, Promise<unknown>>();
  function queue<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const result = (pending.get(key) ?? Promise.resolve()).catch(() => {}).then(operation);
    pending.set(key, result);
    function finish() { if (pending.get(key) === result) pending.delete(key); }
    result.then(finish, finish);
    return result;
  }

  async function load(key: string): Promise<CollectionTopic[]> {
    const raw = await storage.getItem(key);
    if (raw === null) return [];
    const topics = JSON.parse(raw);
    if (!Array.isArray(topics) || !topics.every(t => typeof t?.id === "string" &&
      typeof t.title === "string" && Array.isArray(t.cards) && t.cards.every((c: CollectionCard) =>
        typeof c?.id === "string" && typeof c.front === "string" && typeof c.back === "string"))) {
      throw new Error("Collections data could not be read");
    }
    return topics;
  }

  return {
    read: (key: string) => queue(key, () => load(key)),
    update: (key: string, mutate: (current: CollectionTopic[]) => CollectionTopic[]) => queue(key, async () => {
      const next = mutate(await load(key));
      await storage.setItem(key, JSON.stringify(next));
      return next;
    }),
  };
}
