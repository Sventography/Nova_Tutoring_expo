// app/hooks/useAchievements.ts
import { useEffect, useState, useCallback } from "react";
import {
  grantAchievement,
  hasAchievement,
  listAchievements,
  type Achievement,
} from "@/lib/achievements";

export function useAchievements() {
  const [items, setItems] = useState<Achievement[]>([]);

  const refresh = useCallback(async () => {
    try {
      setItems(await listAchievements());
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const grant = useCallback(
    async (a: Achievement | string) => {
      const ok = await grantAchievement(a);
      if (ok) await refresh();
      return ok;
    },
    [refresh]
  );

  const has = useCallback(async (id: string) => hasAchievement(id), []);

  return { items, refresh, grant, has };
}

export default useAchievements;

