// app/context/CollectionsContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type CollectionCard = {
  id: string;
  front: string;
  back: string;
};

export type CollectionTopic = {
  id: string;
  title: string;
  cards: CollectionCard[];
};

type CollectionsContextValue = {
  topics: CollectionTopic[];
  addCard: (
    card: { front: string; back: string; id?: string },
    topicId?: string,
    title?: string
  ) => Promise<void>;
  removeCard: (topicId: string, cardId: string) => Promise<void>;
  clearAll: () => Promise<void>;
};

const CollectionsContext = createContext<CollectionsContextValue | undefined>(
  undefined
);

const STORAGE_KEY = "@nova_collections_v1";

async function loadFromStorage(): Promise<CollectionTopic[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.warn("[Collections] load error", e);
    return [];
  }
}

async function saveToStorage(topics: CollectionTopic[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(topics));
  } catch (e) {
    console.warn("[Collections] save error", e);
  }
}

export function CollectionsProvider({ children }: { children: React.ReactNode }) {
  const [topics, setTopics] = useState<CollectionTopic[]>([]);

  useEffect(() => {
    loadFromStorage().then(setTopics);
  }, []);

  const addCard = useCallback<
    CollectionsContextValue["addCard"]
  >(async (card, topicId, title) => {
    setTopics((prev) => {
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

      saveToStorage(next);
      return next;
    });
  }, []);

  const removeCard = useCallback<
    CollectionsContextValue["removeCard"]
  >(async (topicId, cardId) => {
    setTopics((prev) => {
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

      saveToStorage(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(async () => {
    setTopics([]);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn("[Collections] clear error", e);
    }
  }, []);

  const value: CollectionsContextValue = {
    topics,
    addCard,
    removeCard,
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
