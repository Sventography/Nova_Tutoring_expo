import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function useEquipped() {
  const [themeId, setThemeId] = useState<string | null>(null);
  const [cursorId, setCursorId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("equipped.theme").then(v => setThemeId(v));
    AsyncStorage.getItem("equipped.cursor").then(v => setCursorId(v));
  }, []);

  const equipTheme = useCallback(async (id: string) => {
    await AsyncStorage.setItem("equipped.theme", id);
    setThemeId(id);
  }, []);

  const equipCursor = useCallback(async (id: string) => {
    await AsyncStorage.setItem("equipped.cursor", id);
    setCursorId(id);
  }, []);

  return { themeId, cursorId, equipTheme, equipCursor };
}
