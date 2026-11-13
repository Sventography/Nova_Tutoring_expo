import React, { createContext, useContext, useMemo, useState } from "react";

type Equipped = { cursor: string | null };
type InventoryContextValue = {
  ownedItems: Set<string>;
  equipped: Equipped;
  purchase: (sku: string) => void;
  equip: (slot: "cursor", key: string) => void;
};

const InventoryContext = createContext<InventoryContextValue>({
  ownedItems: new Set(),
  equipped: { cursor: null },
  purchase: () => {},
  equip: () => {},
});

export const useInventory = () => useContext(InventoryContext);

export const InventoryProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [ownedItems, setOwned] = useState<Set<string>>(new Set());
  const [equipped, setEquipped] = useState<Equipped>({ cursor: null });

  const purchase = (sku: string) => {
    setOwned(prev => new Set(prev).add(sku));
  };

  const equip = (slot: "cursor", key: string) => {
    if (slot === "cursor") setEquipped(prev => ({ ...prev, cursor: key }));
  };

  const value = useMemo(() => ({ ownedItems, equipped, purchase, equip }), [ownedItems, equipped]);
  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
};
