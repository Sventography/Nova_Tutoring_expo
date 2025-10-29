import { useMemo, useRef } from "react";

export function useAchieve() {
  const earned = useRef<Set<string>>(new Set());
  return useMemo(
    () => ({
      unlock: (id: string) => earned.current.add(id),
      isUnlocked: (id: string) => earned.current.has(id),
    }),
    []
  );
}
