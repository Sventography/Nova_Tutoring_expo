import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
export type Card = {
  id: string;
  topic: string;
  question: string;
  answer: string;
  userCreated?: boolean;
  createdAt: number;
};
type Ctx = {
  collection: Card[];
  add: (c: Card) => void;
  remove: (id: string) => void;
  has: (id: string) => boolean;
  setAll: (cards: Card[]) => void;
};
const CollectionsContext = createContext<Ctx>({
  collection: [],
  add: () => {},
  remove: () => {},
  has: () => false,
  setAll: () => {},
});
export const CollectionsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [collection, setCollection] = useState<Card[]>([]);
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem("collection");
      if (raw) {
        setCollection(JSON.parse(raw));
      }
    })();
  }, []);
  useEffect(() => {
    AsyncStorage.setItem("collection", JSON.stringify(collection));
  }, [collection]);
  const add = (c: Card) =>
    setCollection((prev) =>
      prev.find((x) => x.id === c.id) ? prev : [c, ...prev],
    );
  const remove = (id: string) =>
    setCollection((prev) => prev.filter((x) => x.id !== id));
  const has = (id: string) => collection.some((x) => x.id === id);
  const setAll = (cards: Card[]) => {
    const map = new Map<string, Card>();
    for (const c of cards) {
      if (c.id) map.set(c.id, c);
    }
    setCollection(
      Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt),
    );
  };
  const v = useMemo(
    () => ({ collection, add, remove, has, setAll }),
    [collection],
  );
  return (
    <CollectionsContext.Provider value={v}>
      {children}
    </CollectionsContext.Provider>
  );
};
export const useCollections = () => useContext(CollectionsContext);
