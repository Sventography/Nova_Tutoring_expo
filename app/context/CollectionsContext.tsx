// app/context/CollectionsContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useUser } from "./UserContext";
import { collectionKey, createCollectionStore, type CollectionCard, type CollectionTopic } from "../../features/collections/store";
export type { CollectionCard, CollectionTopic } from "../../features/collections/store";

const storage = createCollectionStore(AsyncStorage);

type CollectionsContextValue = {
  ownerKey: string | null;
  topics: CollectionTopic[];
  addCard: (
    card: { front: string; back: string; id?: string },
    topicId?: string,
    title?: string
  ) => Promise<void>;
  removeCard: (topicId: string, cardId: string) => Promise<void>;
  /** New: remove by front/back text (used by Flashcards toggle) */
  removeCardByContent: (
    topicId: string,
    front: string,
    back: string
  ) => Promise<void>;
  clearAll: () => Promise<void>;
};

const CollectionsContext = createContext<CollectionsContextValue | undefined>(
  undefined
);

export function CollectionsProvider({ children }: { children: React.ReactNode }) {
  const { ready, session, supabaseUserId } = useUser();
  const ownerKey = collectionKey(ready, session?.user.id ?? null, supabaseUserId);
  const scope = useMemo(() => ({ key: ownerKey, active: false }), [ownerKey]);
  const [snapshot, setSnapshot] = useState<{ owner: typeof scope; topics: CollectionTopic[] } | null>(null);
  const topics = snapshot?.owner === scope ? snapshot.topics : [];

  useLayoutEffect(() => {
    scope.active = true;
    if (scope.key !== null) {
      storage.read(scope.key).then(loaded => {
        if (scope.active) setSnapshot({ owner: scope, topics: loaded });
      }).catch(() => console.warn("[Collections] Could not load saved cards"));
    }
    return () => { scope.active = false; };
  }, [scope]);

  const update = useCallback(async (mutate: (prev: CollectionTopic[]) => CollectionTopic[]) => {
    if (!scope.active || scope.key === null) throw new Error("Account is changing");
    const saved = await storage.update(scope.key, mutate);
    if (!scope.active) throw new Error("Account changed while saving");
    setSnapshot({ owner: scope, topics: saved });
  }, [scope]);

  const addCard = useCallback<
    CollectionsContextValue["addCard"]
  >(async (card, topicId, title) => {
    await update((prev) => {
      const tid = topicId || "saved-flashcards";
      const tTitle = title || "Saved Flashcards";

      const newId =
        card.id ||
        `${tid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const nextCard: CollectionCard = {
        id: String(newId),
        front: card.front,
        back: card.back,
      };

      const idx = prev.findIndex((t) => t.id === tid);
      let next: CollectionTopic[];

      if (idx === -1) {
        next = [
          ...prev,
          {
            id: tid,
            title: tTitle,
            cards: [nextCard],
          },
        ];
      } else {
        next = prev.map((t, i) =>
          i === idx
            ? {
                ...t,
                cards: [...t.cards, nextCard],
              }
            : t
        );
      }

      return next;
    });
  }, [update]);

  const removeCard = useCallback<
    CollectionsContextValue["removeCard"]
  >(async (topicId, cardId) => {
    await update((prev) => {
      const next = prev
        .map((t) =>
          t.id === topicId
            ? {
                ...t,
                cards: t.cards.filter((c) => c.id !== cardId),
              }
            : t
        )
        .filter((t) => t.cards.length > 0);

      return next;
    });
  }, [update]);

  const removeCardByContent = useCallback<
    CollectionsContextValue["removeCardByContent"]
  >(async (topicId, front, back) => {
    const norm = (s: string) => s.trim().toLowerCase();

    await update((prev) => {
      const next = prev
        .map((t) => {
          if (t.id !== topicId) return t;
          const filtered = t.cards.filter(
            (c) =>
              !(
                norm(c.front || "") === norm(front || "") &&
                norm(c.back || "") === norm(back || "")
              )
          );
          return { ...t, cards: filtered };
        })
        .filter((t) => (t.cards?.length ?? 0) > 0);

      return next;
    });
  }, [update]);

  const clearAll = useCallback(async () => {
    await update(() => []);
  }, [update]);

  const value: CollectionsContextValue = {
    ownerKey,
    topics,
    addCard,
    removeCard,
    removeCardByContent,
    clearAll,
  };

  return (
    <CollectionsContext.Provider value={value}>
      {children}
    </CollectionsContext.Provider>
  );
}

export function useCollections() {
  const ctx = useContext(CollectionsContext);
  if (!ctx) {
    throw new Error("useCollections must be used within CollectionsProvider");
  }
  return ctx;
}