import { useState, useCallback } from "react";
type SizeMap = Record<string, string>;
export default function useSelectedSizes() {
  const [map, setMap] = useState<SizeMap>({});
  const get = useCallback((k: string) => map[k], [map]);
  const set = useCallback((k: string, v: string) => {
    setMap(m => (v ? { ...m, [k]: v } : m));
  }, []);
  const clear = useCallback((k: string) => {
    setMap(m => {
      const n = { ...m };
      delete n[k];
      return n;
    });
  }, []);
  return { get, set, clear, map };
}
