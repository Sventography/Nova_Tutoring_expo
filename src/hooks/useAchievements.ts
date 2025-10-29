import { useEffect, useState, useCallback } from "react";
import Toast from "react-native-toast-message";
import { listAll, getPoints } from "@lib/achievements";

export function useContextSafe() {
  const [items, setItems] = useState<any[]>([]);
  const [points, setPoints] = useState(0);

  const refresh = useCallback(async () => {
    const [list, pts] = await Promise.all([listAll(), getPoints()]);
    setItems(list);
    setPoints(pts);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // helper toast
  const showUnlockedToast = (name: string) => {
    Toast.show({
      type: "success",
      text1: "Achievement Unlocked",
      text2: name,
      position: "top",
    });
  };

  return { items, points, refresh, showUnlockedToast };
}
