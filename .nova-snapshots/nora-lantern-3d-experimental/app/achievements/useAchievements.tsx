import { useCallback, useEffect, useState } from "react";
import { getProgress, recordStat, type EarnResult } from "./engine";

export function useAchievements() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<any>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    const p = await getProgress();
    setProgress(p);
    setLoading(false);
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const bump = useCallback(
    async (delta: any): Promise<EarnResult> => {
      const r = await recordStat(delta);
      await refresh();
      return r;
    },
    [refresh],
  );
  return { loading, progress, bump, refresh };
}
