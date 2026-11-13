// app/purchases/index.tsx
import React, { useCallback, useMemo, useState } from "react";
import { SafeAreaView, ScrollView, View, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { catalog } from "../_lib/catalog";

// Storage key used across the app
const PURCHASES_KEY = "@nova/purchases";

// ---- id canon so map/array + legacy ids match catalog ----
function canonId(id: string) {
  let v = String(id || "").trim();
  if (!v.includes(":")) {
    if (v.startsWith("cursor_") || v.startsWith("cursor"))
      v = "cursor:" + v.replace(/^cursor[_:]?/, "");
    else if (v.startsWith("theme_") || v.startsWith("theme"))
      v = "theme:" + v.replace(/^theme[_:]?/, "");
  }
  v = v.replace(/-/g, "_");
  if (v === "cursor:startrail" || v === "cursor_startrail") v = "cursor:star_trail";
  if (v === "theme:black-gold") v = "theme:blackgold";
  if (v === "theme:neon-purple") v = "theme:neonpurple";
  return v;
}

function toArray(input: any): string[] {
  if (Array.isArray(input)) return input.slice();
  if (input && typeof input === "object") return Object.keys(input);
  return [];
}

type RowItem = {
  id: string;
  title: string;
  category?: string;
};

export default function PurchasesScreen() {
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Load purchases on tab focus
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        try {
          const raw = (await AsyncStorage.getItem(PURCHASES_KEY)) ?? "{}";
          let parsed: any;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = {};
          }
          const arr = toArray(parsed);
          if (alive) setIds(arr);
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  // Enrich with catalog info
  const rows: RowItem[] = useMemo(() => {
    const byCanon = new Map(catalog.map((c) => [canonId(c.id), c]));
    // newest first if you’ve been unshifting elsewhere
    return ids.map((id) => {
      const meta = byCanon.get(canonId(id));
      if (meta) {
        return { id, title: meta.title, category: meta.category };
      }
      // fallback if unknown id
      return { id, title: id };
    });
  }, [ids]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "black" }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {loading ? (
          <Text style={{ color: "#9ca3af" }}>Loading purchases…</Text>
        ) : rows.length === 0 ? (
          <Text style={{ color: "#9ca3af" }}>No purchases yet.</Text>
        ) : (
          rows.map((p) => (
            <View
              key={p.id}
              style={{
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                backgroundColor: "rgba(255,255,255,0.04)",
                marginBottom: 10,
              }}
            >
              <Text style={{ color: "white", fontWeight: "800" }}>{p.title}</Text>
              {p.category ? (
                <Text style={{ color: "#9ca3af", marginTop: 6 }}>{p.category}</Text>
              ) : null}
              <Text style={{ color: "#6b7280", marginTop: 4, fontSize: 12 }}>
                id: {p.id}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
