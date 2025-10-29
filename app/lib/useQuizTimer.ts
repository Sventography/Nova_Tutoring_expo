import { useEffect, useRef, useState } from "react";

export function useQuizTimer(secondsTotal: number) {
  const [secondsLeft, setSecondsLeft] = useState(secondsTotal);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timer | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [running]);

  useEffect(() => {
    if (secondsLeft === 0 && running) {
      setRunning(false);
    }
  }, [secondsLeft, running]);

  const start = () => {
    setSecondsLeft(secondsTotal);
    setRunning(true);
  };
  const end = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    setSecondsLeft(secondsTotal);
  };

  return { secondsLeft, running, start, end, reset };
}

