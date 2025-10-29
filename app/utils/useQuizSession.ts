import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Manages quiz session timing and a sessionKey you can feed into useOptionsMemo.
 * Call resetForTopic(topicId) when user picks a topic; call start() to begin timer.
 */
export function useQuizSession(
  durationSec: number,
  onTimesUp?: () => void
) {
  const [secondsLeft, setSecondsLeft] = useState<number>(durationSec);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionKey, setSessionKey] = useState<number>(() => Date.now());
  const timerRef = useRef<NodeJS.Timer | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (timerRef.current) return;
    setIsRunning(true);
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearTimer();
          setIsRunning(false);
          onTimesUp && onTimesUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer, onTimesUp]);

  const stop = useCallback(() => {
    clearTimer();
    setIsRunning(false);
  }, [clearTimer]);

  const resetForTopic = useCallback((topicId?: string) => {
    stop();
    setSecondsLeft(durationSec);
    setSessionKey(Date.now() ^ (topicId ? hashStr(topicId) : 0));
  }, [durationSec, stop]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return { secondsLeft, isRunning, start, stop, resetForTopic, sessionKey, setSecondsLeft };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}
