import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SHOP_ITEMS, ShopItem } from "../constants/payments";
import AsyncStorage from "@react-native-async-storage/async-storage";

const INV_KEY = "NT_INVENTORY_V1";

type Inventory = Record<string, number>;

async function loadInventory(): Promise<Inventory> {
  const raw = await AsyncStorage.getItem(INV_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) ?? {};
  } catch {
    return {};
  }
}

export default function PurchasesScreen() {
  const insets = useSafeAreaInsets();
  const [inv, setInv] = useState<Inventory>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setInv(await loadInventory());
      setLoading(false);
    })();
  }, []);

  const owned: ShopItem[] = useMemo(
    () => SHOP_ITEMS.filter((i) => (inv[i.id] ?? 0) > 0),
    [inv],
  );

  return (
    <View variant="bg" style={[s.container, { paddingTop: insets.top + 6 }]}>
      <Text style={s.h1}>Your Purchases</Text>
      {loading ? (
        <Text style={s.soft}>Loading…</Text>
      ) : owned.length === 0 ? (
        <Text style={s.soft}>Nothing purchased yet.</Text>
      ) : (
        <FlatList
          data={owned}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => (
            <View style={s.row}>
              <Text style={s.name}>{item.title}</Text>
              <Text style={s.soft}>x{inv[item.id]}</Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050a12", paddingHorizontal: 16 },
  h1: { color: "#e6f0ff", fontSize: 22, fontWeight: "900", marginBottom: 8 },
  soft: { color: "#a6c8ff" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  name: { color: "#e7f1ff", fontWeight: "800" },
  sep: { height: 1, backgroundColor: "#102036" },
});
