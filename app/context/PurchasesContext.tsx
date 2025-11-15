import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { canonId, canonNs } from "../utils/canonId";

type PurchasesMap = Record<string, number>; // key -> timestamp
type Ctx = {
  ready: boolean;
  all: PurchasesMap;
  isOwned: (nsId: string) => boolean;
  grant: (nsId: string) => Promise<void>;
};

const PurchasesContext = createContext<Ctx | null>(null);

// NEW canonical storage key
const KEY = "purchases.map.v1";
// Legacy keys we will migrate from (if they existed)
const LEGACY_KEYS = [
  "purchases.map",                 // old
  "purchases",                     // very old
];

// normalize any incoming keys to canonical "theme:xyz" / "cursor:xyz" / "item"
function normalizeKey(k: string): string {
  if (!k) return k;
  // Already namespaced?
  if (k.includes(":")) {
    const [ns, id] = k.split(":");
    if (!id) return k;
    const kind = ns === "theme" || ns === "cursor" ? (ns as "theme"|"cursor") : "item";
    return canonNs(kind, id);
  }
  // Try guessing by common prefixes in sloppy data
  const raw = k.toLowerCase();
  if (raw.startsWith("theme")) return canonNs("theme", raw.replace(/^theme[:\-]*/, ""));
  if (raw.startsWith("cursor")) return canonNs("cursor", raw.replace(/^cursor[:\-]*/, ""));
  // fallthrough: plain item id
  return canonNs("item", raw);
}

export const PurchasesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [map, setMap] = useState<PurchasesMap>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Load canonical first
        const raw = (await AsyncStorage.getItem(KEY)) || "{}";
        let current: PurchasesMap = {};
        try { current = JSON.parse(raw); } catch { current = {}; }

        // Attempt legacy migrations (merge → canonicalize)
        for (const legacy of LEGACY_KEYS) {
          const legacyRaw = await AsyncStorage.getItem(legacy);
          if (!legacyRaw) continue;
          try {
            const legacyMap: PurchasesMap = JSON.parse(legacyRaw);
            for (const k of Object.keys(legacyMap || {})) {
              const nk = normalizeKey(k);
              current[nk] = Math.max(current[nk] || 0, legacyMap[k] || 0);
            }
          } catch {}
        }

        // also canonicalize any sloppy keys already inside v1
        const normalized: PurchasesMap = {};
        for (const k of Object.keys(current)) {
          normalized[normalizeKey(k)] = Math.max(normalized[normalizeKey(k)] || 0, current[k] || 0);
        }

        // persist back in canonical form
        await AsyncStorage.setItem(KEY, JSON.stringify(normalized));
        setMap(normalized);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persist = async (next: PurchasesMap) => {
    setMap(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  };

  const isOwned = (nsId: string) => {
    const k = nsId.includes(":") ? nsId : normalizeKey(nsId);
    return Boolean(map[k]);
  };

  const grant = async (nsId: string) => {
    const k = nsId.includes(":") ? nsId : normalizeKey(nsId);
    const next = { ...map, [k]: Date.now() };
    await persist(next);
  };

  const value = useMemo<Ctx>(() => ({ ready, all: map, isOwned, grant }), [ready, map]);

  return <PurchasesContext.Provider value={value}>{children}</PurchasesContext.Provider>;
};

export const usePurchases = () => {
  const ctx = useContext(PurchasesContext);
  if (!ctx) throw new Error("usePurchases must be used inside <PurchasesProvider>");
  return ctx;
};
