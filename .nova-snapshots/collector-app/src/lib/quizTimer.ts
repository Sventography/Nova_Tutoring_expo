import { useEffect, useState } from "react";
export function useQuizTimer() {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 250);
    return () => clearInterval(id);
  }, [startedAt]);
  function start() {
    setStartedAt(Date.now());
  }
  function stop() {
    setStartedAt(null);
  }
  return { elapsed, start, stop, running: startedAt !== null };
}
