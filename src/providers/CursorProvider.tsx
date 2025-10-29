import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { CURSOR_MAP, CursorKey } from "../theme/cursorMap";
import { useInventory } from "../state/InventoryProvider";

type CursorContextValue = {
  cursor: CursorKey;
  equipCursor: (key: CursorKey) => boolean;
};

const CursorContext = createContext<CursorContextValue>({
  cursor: "default",
  equipCursor: () => false,
});

export const useCursor = () => useContext(CursorContext);

export const CursorProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { ownedItems, equipped } = useInventory();
  const [cursor, setCursor] = useState<CursorKey>((equipped.cursor as CursorKey) ?? "default");

  const equipCursor = (key: CursorKey) => {
    if (key === "default") {
      setCursor("default");
      return true;
    }
    const owned = ownedItems.has(`cursor:${key}`);
    if (!owned) return false;
    setCursor(key);
    return true;
  };

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const html = document.documentElement;
    html.classList.add("use-custom-cursor");
    html.style.setProperty("--app-cursor", CURSOR_MAP[cursor]);
  }, [cursor]);

  const value = useMemo(() => ({ cursor, equipCursor }), [cursor]);

  return <CursorContext.Provider value={value}>{children}</CursorContext.Provider>;
};
