import React, { useEffect, useState } from "react";
import { View, Text, Switch, Pressable, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getInventory, equip, isOwned } from "../lib/store";
import { SHOP_ITEMS } from "../constants/shop";
import bus from "../lib/bus";

const K_CURSOR_SIM = "settings.cursor_sim";

export function CursorSettings() {
  const [enabled, setEnabled] = useState(true);
  const [owned, setOwned] = useState<typeof SHOP_ITEMS>([]);
  const [equipped, setEquipped] = useState<string | null>(null);

  async function refresh() {
    const inv = await getInventory();
    setEquipped((inv.equipped as any)?.cursor ?? null);
    const cursors = SHOP_ITEMS.filter((i) => i.type === "cursor");
    const filtered: typeof SHOP_ITEMS = [];
    for (const it of cursors) {
      if (await isOwned(it.id)) filtered.push(it);
    }
    setOwned(filtered);
    const pref = await AsyncStorage.getItem(K_CURSOR_SIM);
    setEnabled(pref !== "0");
  }

  useEffect(() => {
    refresh();
    const h = () => refresh();
    bus.on("equipped_changed", h);
    return () => bus.off("equipped_changed", h);
  }, []);

  async function toggle() {
    const next = !enabled;
    setEnabled(next);
    await AsyncStorage.setItem(K_CURSOR_SIM, next ? "1" : "0");
    bus.emit("cursor_settings_changed", { enabled: next });
  }

  async function handleEquip(id: string) {
    await equip("cursor", id);
    await refresh();
  }

  return (
    <View style={{ marginTop: 20 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <Text style={{ color: "#e2e8f0", fontSize: 16, fontWeight: "700" }}>
          Simulated Cursor
        </Text>
        <Switch
          value={enabled}
          onValueChange={toggle}
          trackColor={{ false: "#334155", true: "#38bdf8" }}
          thumbColor={enabled ? "#a5f3fc" : "#64748b"}
        />
      </View>
      <Text style={{ color: "#94a3b8", marginBottom: 8 }}>
        Choose your cursor:
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {owned.map((it) => (
          <Pressable
            key={it.id}
            onPress={() => handleEquip(it.id)}
            style={({ pressed }) => ({
              marginRight: 12,
              padding: 10,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: it.id === equipped ? "#22c55e" : "#334155",
              backgroundColor: pressed ? "#0a1621" : "#0b1220",
            })}
          >
            <Text
              style={{
                color: it.id === equipped ? "#86efac" : "#cbd5e1",
                fontWeight: "700",
              }}
            >
              {it.title}
            </Text>
          </Pressable>
        ))}
        {!owned.length && (
          <View style={{ padding: 10 }}>
            <Text style={{ color: "#94a3b8" }}>No cursors owned yet</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
