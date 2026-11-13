/**
 * Stable-per-session randomized options.
 * Pass a sessionKey that you bump whenever a quiz starts or topic changes.
 */
import { useMemo } from "react";

function shuffle<T>(arr: T[]): T[] {
  // In-place Fisher–Yates would be ideal; this is fine for small arrays.
  return arr.sort(() => Math.random() - 0.5);
}

export function useOptionsMemo(
  correct: string,
  allAnswers: string[],
  sessionKey: string | number
): string[] {
  return useMemo(() => {
    if (!correct) return [];
    const pool = (allAnswers ?? []).filter(a => a && a !== correct);
    // pick 3 random wrongs from the pool
    const wrongs = shuffle([...pool]).slice(0, 3);
    return shuffle([...wrongs, correct]);
  }, [correct, sessionKey]); // re-shuffle when the question OR session changes
}
