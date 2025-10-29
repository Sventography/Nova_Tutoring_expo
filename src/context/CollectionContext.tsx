import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  addToCollection,
  loadCollection,
  removeFromCollection,
  saveCollection,
  UserCard,
} from "../lib/storage";

type Ctx = {
  cards: UserCard[];
  refresh: () => Promise<void>;
  add: (c: UserCard) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setAll: (c: UserCard[]) => Promise<void>;
};

const CollectionContext = createContext<Ctx | null>(null);

export function CollectionProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<UserCard[]>([]);
  const refresh = async () => setCards(await loadCollection());
  const add = async (c: UserCard) => {
    await addToCollection(c);
    await refresh();
  };
  const remove = async (id: string) => {
    await removeFromCollection(id);
    await refresh();
  };
  const setAll = async (c: UserCard[]) => {
    await saveCollection(c);
    await refresh();
  };
  useEffect(() => {
    refresh();
  }, []);
  return (
    <CollectionContext.Provider value={{ cards, refresh, add, remove, setAll }}>
      {children}
    </CollectionContext.Provider>
  );
}

export function useCollection() {
  const ctx = useContext(CollectionContext);
  if (!ctx)
    throw new Error("useCollection must be used within CollectionProvider");
  return ctx;
}
