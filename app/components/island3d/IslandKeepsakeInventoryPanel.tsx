// app/components/island3d/IslandKeepsakeInventoryPanel.tsx
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useIslandKeepsakes } from "../../context/IslandKeepsakeContext";

export default function IslandKeepsakeInventoryPanel() {
  const {
    inventoryKeepsakes,
    placeFromInventory,
  } = useIslandKeepsakes();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [
          styles.header,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.icon}>
          <Ionicons name="sparkles-outline" size={18} color="#c4b5fd" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Keepsake Inventory</Text>
          <Text style={styles.subtitle}>
            {inventoryKeepsakes.length} earned keepsake
            {inventoryKeepsakes.length === 1 ? "" : "s"} waiting
          </Text>
        </View>
        <Ionicons
          name={open ? "remove" : "add"}
          size={18}
          color="#cbd5e1"
        />
      </Pressable>

      {open ? (
        <View style={styles.body}>
          {inventoryKeepsakes.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.row}
            >
              {inventoryKeepsakes.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => placeFromInventory(item.key)}
                  style={({ pressed }) => [
                    styles.item,
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[
                      styles.preview,
                      { borderColor: `${item.accent}88` },
                    ]}
                  >
                    <Ionicons
                      name="sparkles"
                      size={24}
                      color={item.accent}
                    />
                  </View>
                  <Text numberOfLines={2} style={styles.itemTitle}>
                    {item.title}
                  </Text>
                  <Text style={styles.place}>PLACE</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.empty}>
              Every earned keepsake is currently placed on the island.
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(196,181,253,0.20)",
    backgroundColor: "rgba(8,28,52,0.56)",
    overflow: "hidden",
  },
  header: {
    minHeight: 58,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(124,58,237,0.10)",
  },
  title: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 2,
    color: "#64748b",
    fontSize: 9,
    fontWeight: "700",
  },
  body: {
    borderTopWidth: 1,
    borderTopColor: "rgba(196,181,253,0.12)",
    padding: 10,
  },
  row: {
    gap: 8,
    paddingRight: 8,
  },
  item: {
    width: 112,
    minHeight: 104,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(196,181,253,0.18)",
    backgroundColor: "rgba(2,6,23,0.54)",
    padding: 9,
  },
  preview: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  itemTitle: {
    marginTop: 7,
    color: "#f8fafc",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
  },
  place: {
    marginTop: 6,
    color: "#c4b5fd",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  empty: {
    color: "#94a3b8",
    fontSize: 10,
    lineHeight: 14,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});
