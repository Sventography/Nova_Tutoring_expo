// app/components/island3d/IslandDecorationShopPanel.tsx
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useCoins } from "../../context/CoinsContext";
import { useIslandDecorations } from "../../context/IslandDecorationContext";

type ShopFilter =
  | "all"
  | "path"
  | "nature"
  | "fantasy"
  | "cosmic"
  | "furniture"
  | "water";

const SHOP_FILTERS: Array<{ id: ShopFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "nature", label: "Nature" },
  { id: "fantasy", label: "Fantasy" },
  { id: "cosmic", label: "Cosmic" },
  { id: "furniture", label: "Furniture" },
  { id: "water", label: "Water" },
  { id: "path", label: "Paths" },
];

function Header({ title, subtitle, icon, open, onToggle }: {
  title: string;
  subtitle: string;
  icon: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable onPress={onToggle} style={({ pressed }) => [styles.header, pressed && styles.pressed]}>
      <View style={styles.headerIcon}>
        <Ionicons name={icon as any} size={18} color="#67e8f9" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name={open ? "remove" : "add"} size={18} color="#cbd5e1" />
    </Pressable>
  );
}

export default function IslandDecorationShopPanel() {
  const { coins } = useCoins();
  const {
    catalog,
    placements,
    getInventoryCount,
    buyDecoration,
    placeFromInventory,
    moveAllToInventory,
  } = useIslandDecorations();
  const [shopOpen, setShopOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [inventoryMessage, setInventoryMessage] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(catalog[0]?.id ?? null);
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<ShopFilter>("all");

  const visibleCatalog = useMemo(
    () =>
      filter === "all"
        ? catalog
        : catalog.filter((item) => item.category === filter),
    [catalog, filter]
  );

  const selectedItem = useMemo(
    () =>
      visibleCatalog.find((item) => item.id === selectedItemId) ??
      visibleCatalog[0] ??
      null,
    [selectedItemId, visibleCatalog]
  );

  const inventoryItems = useMemo(
    () => catalog.filter((item) => getInventoryCount(item.id) > 0),
    [catalog, getInventoryCount, placements]
  );

  const inventoryTotal = useMemo(
    () => inventoryItems.reduce(
      (total, item) => total + getInventoryCount(item.id),
      0
    ),
    [getInventoryCount, inventoryItems]
  );

  const buy = async () => {
    if (!selectedItem || buying) return;
    setBuying(true);
    setMessage(null);
    try {
      const result = await buyDecoration(selectedItem.id);
      if (result.ok) {
        setMessage(`${selectedItem.title} purchased! It is waiting in Decoration Inventory.`);
        setInventoryMessage(`${selectedItem.title} is ready to PLACE whenever you want it.`);
        setInventoryOpen(true);
      } else if (result.reason === "insufficient_coins") {
        setMessage("You do not have enough coins for this decoration.");
      } else {
        setMessage("That purchase could not be completed right now.");
      }
    } finally {
      setBuying(false);
    }
  };

  const place = (itemId: string) => {
    const item = catalog.find((candidate) => candidate.id === itemId);
    const placementId = placeFromInventory(itemId);

    if (!placementId) {
      setInventoryMessage("That decoration could not be placed right now.");
      return;
    }

    setInventoryMessage(
      `${item?.title ?? "Decoration"} placed and selected. Move it where you want, then SAVE.`
    );
  };

  const confirmMoveAll = () => {
    if (placements.length <= 0) return;

    Alert.alert(
      "Move all decorations?",
      `Move all ${placements.length} placed decoration${placements.length === 1 ? "" : "s"} back to Decoration Inventory? Nothing you bought will be deleted and no coins are refunded. This change is not permanent until you tap SAVE.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Move All",
          style: "destructive",
          onPress: () => {
            const moved = moveAllToInventory();
            if (moved > 0) {
              setInventoryOpen(true);
              setInventoryMessage(
                `${moved} decoration${moved === 1 ? "" : "s"} moved to Inventory. Tap CANCEL to undo, or SAVE to keep the change.`
              );
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <View style={styles.card}>
        <Header
          title="Decoration Shop"
          subtitle={`${coins} coins · cheap fillers for full landscapes`}
          icon="storefront-outline"
          open={shopOpen}
          onToggle={() => setShopOpen((value) => !value)}
        />

        {shopOpen ? (
          <View style={styles.body}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
            >
              {SHOP_FILTERS.map((entry) => {
                const active = filter === entry.id;
                return (
                  <Pressable
                    key={entry.id}
                    onPress={() => {
                      setFilter(entry.id);
                      setMessage(null);
                    }}
                    style={({ pressed }) => [
                      styles.filterChip,
                      active && styles.filterChipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        active && styles.filterTextActive,
                      ]}
                    >
                      {entry.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {visibleCatalog.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => { setSelectedItemId(item.id); setMessage(null); }}
                  style={({ pressed }) => [
                    styles.item,
                    item.id === selectedItem?.id && { borderColor: item.accent },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.emojiSmall}>{item.previewEmoji}</Text>
                  <Text numberOfLines={2} style={styles.itemTitle}>{item.shortTitle}</Text>
                  <Text style={[styles.price, { color: item.accent }]}>{item.price} 🪙</Text>
                </Pressable>
              ))}
            </ScrollView>

            {selectedItem ? (
              <View style={[styles.detail, { borderColor: `${selectedItem.accent}66` }]}>
                <View style={[styles.preview, { backgroundColor: `${selectedItem.accent}14` }]}>
                  <Text style={styles.emojiLarge}>{selectedItem.previewEmoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailTitle}>{selectedItem.title}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaChip}>{selectedItem.category.toUpperCase()}</Text>
                    <Text style={styles.metaChip}>
                      {selectedItem.model.replace(/_/g, " ").toUpperCase()}
                    </Text>
                    <Text style={[styles.metaChip, { color: selectedItem.accent }]}>
                      {selectedItem.rarity.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.detailBody}>{selectedItem.description}</Text>
                  <Pressable
                    onPress={() => void buy()}
                    disabled={buying}
                    style={({ pressed }) => [styles.buy, buying && styles.disabled, pressed && !buying && styles.pressed]}
                  >
                    <Text style={styles.buyText}>
                      {buying ? "BUYING…" : `BUY FOR ${selectedItem.price} COINS`}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {message ? (
              <View style={styles.message}>
                <Text style={styles.messageText}>{message}</Text>
                <Pressable onPress={() => setMessage(null)} hitSlop={8}>
                  <Ionicons name="close" size={15} color="#94a3b8" />
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Header
          title="Decoration Inventory"
          subtitle={`${inventoryTotal} decoration${inventoryTotal === 1 ? "" : "s"} waiting`}
          icon="leaf-outline"
          open={inventoryOpen}
          onToggle={() => setInventoryOpen((value) => !value)}
        />
        {inventoryOpen ? (
          <View style={styles.body}>
            {placements.length > 0 ? (
              <Pressable
                onPress={confirmMoveAll}
                style={({ pressed }) => [
                  styles.moveAll,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="archive-outline" size={16} color="#fecaca" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.moveAllText}>MOVE ALL DECORATIONS TO INVENTORY</Text>
                  <Text style={styles.moveAllSubtext}>
                    Keeps ownership and coin purchases intact
                  </Text>
                </View>
              </Pressable>
            ) : null}

            {inventoryItems.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {inventoryItems.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => place(item.id)}
                    style={({ pressed }) => [styles.item, pressed && styles.pressed]}
                  >
                    <Text style={styles.emojiSmall}>{item.previewEmoji}</Text>
                    <Text numberOfLines={2} style={styles.itemTitle}>{item.shortTitle}</Text>
                    <Text style={styles.count}>×{getInventoryCount(item.id)}</Text>
                    <Text style={styles.place}>PLACE</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.empty}>Every decoration you own is currently placed.</Text>
            )}

            {inventoryMessage ? (
              <View style={styles.message}>
                <Text style={styles.messageText}>{inventoryMessage}</Text>
                <Pressable onPress={() => setInventoryMessage(null)} hitSlop={8}>
                  <Ionicons name="close" size={15} color="#94a3b8" />
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, borderColor: "rgba(56,189,248,0.20)", backgroundColor: "rgba(8,28,52,0.56)", overflow: "hidden" },
  header: { minHeight: 58, paddingHorizontal: 11, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 9 },
  headerIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(34,211,238,0.08)" },
  headerTitle: { color: "#f8fafc", fontSize: 13, fontWeight: "900" },
  headerSubtitle: { marginTop: 2, color: "#64748b", fontSize: 9, fontWeight: "700" },
  body: { borderTopWidth: 1, borderTopColor: "rgba(56,189,248,0.12)", padding: 10, gap: 10 },
  filters: { gap: 6, paddingRight: 8 },
  filterChip: { minHeight: 30, borderRadius: 999, borderWidth: 1, borderColor: "rgba(148,163,184,0.18)", backgroundColor: "rgba(2,6,23,0.46)", paddingHorizontal: 11, alignItems: "center", justifyContent: "center" },
  filterChipActive: { borderColor: "rgba(103,232,249,0.72)", backgroundColor: "rgba(8,145,178,0.16)" },
  filterText: { color: "#94a3b8", fontSize: 9, fontWeight: "900" },
  filterTextActive: { color: "#67e8f9" },
  row: { gap: 8, paddingRight: 8 },
  item: { width: 104, minHeight: 104, borderRadius: 14, borderWidth: 1, borderColor: "rgba(148,163,184,0.18)", backgroundColor: "rgba(2,6,23,0.54)", padding: 9 },
  emojiSmall: { fontSize: 27 },
  itemTitle: { marginTop: 6, color: "#f8fafc", fontSize: 11, lineHeight: 14, fontWeight: "900" },
  price: { marginTop: 5, fontSize: 10, fontWeight: "900" },
  count: { marginTop: 4, color: "#94a3b8", fontSize: 10, fontWeight: "800" },
  place: { marginTop: 4, color: "#67e8f9", fontSize: 9, fontWeight: "900" },
  detail: { borderRadius: 16, borderWidth: 1, backgroundColor: "rgba(2,6,23,0.60)", padding: 10, flexDirection: "row", gap: 10 },
  preview: { width: 76, height: 76, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  emojiLarge: { fontSize: 46 },
  detailTitle: { color: "#f8fafc", fontSize: 15, fontWeight: "900" },
  metaRow: { marginTop: 4, flexDirection: "row", flexWrap: "wrap", gap: 5 },
  metaChip: { color: "#cbd5e1", fontSize: 8, fontWeight: "900", letterSpacing: 0.4 },
  detailBody: { marginTop: 3, color: "#94a3b8", fontSize: 10, lineHeight: 14 },
  buy: { marginTop: 8, minHeight: 35, borderRadius: 11, backgroundColor: "#67e8f9", alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  buyText: { color: "#020617", fontSize: 9, fontWeight: "900" },
  message: { borderRadius: 11, borderWidth: 1, borderColor: "rgba(125,211,252,0.20)", backgroundColor: "rgba(14,116,144,0.10)", padding: 8, flexDirection: "row", alignItems: "center", gap: 7 },
  messageText: { flex: 1, color: "#bae6fd", fontSize: 9, lineHeight: 13 },
  moveAll: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: "rgba(248,113,113,0.28)", backgroundColor: "rgba(127,29,29,0.14)", paddingHorizontal: 10, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  moveAllText: { color: "#fecaca", fontSize: 9, fontWeight: "900" },
  moveAllSubtext: { marginTop: 2, color: "#94a3b8", fontSize: 8, lineHeight: 11 },
  empty: { color: "#64748b", fontSize: 10 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
});
