import React, { useEffect, useState } from "react";
import { useThemeColors } from "../providers/ThemeBridge";
import { View, Text, Pressable, Modal, ScrollView } from "react-native";
import { SHOP_ITEMS } from "../constants/shop";
import { equip, getInventory, isOwned } from "../lib/store";

type PickerProps = {
  title: string;
  type: "theme" | "cursor" | "plush";
};

export default function EquipPicker({ title, type }: PickerProps) {
  const palette = useThemeColors();
  const [open, setOpen] = useState(false);
  const [owned, setOwned] = useState(SHOP_ITEMS.filter((i) => i.type === type));
  const [equipped, setEquipped] = useState<string | null>(null);

  async function refresh() {
    const inv = await getInventory();
    setEquipped((inv.equipped as any)?.[type] ?? null);
    const items = SHOP_ITEMS.filter((i) => i.type === type);
    const filtered: typeof SHOP_ITEMS = [];
    for (const it of items) {
      if (await isOwned(it.id)) filtered.push(it as any);
    }
    setOwned(filtered as any);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) await refresh();
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSelect(id: string) {
    await equip(type, id);
    await refresh();
    setOpen(false);
  }

  const equippedItem = owned.find((o) => o.id === equipped);

  return (
    <View variant="bg" style={{ marginBottom: 16 }}>
      <Text
        style={{
          color: palette.text,
          fontSize: 16,
          fontWeight: "800",
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={!owned.length}
        style={({ pressed }) => ({
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: owned.length ? palette.accent : "#334155",
          backgroundColor: pressed ? "#07131d" : "#06121a",
          opacity: owned.length ? 1 : 0.6,
        })}
      >
        <Text style={{ color: "#a5f3fc", fontWeight: "700" }}>
          {equippedItem
            ? equippedItem.title
            : owned.length
              ? "Choose…"
              : "No items owned"}
        </Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <View
            style={{
              borderRadius: 16,
              backgroundColor: palette.card,
              borderWidth: 1,
              borderColor: palette.border,
              maxHeight: "70%",
            }}
          >
            <View
              style={{
                padding: 14,
                borderBottomWidth: 1,
                borderBottomColor: "#162133",
              }}
            >
              <Text
                style={{ color: palette.text, fontSize: 18, fontWeight: "800" }}
              >
                Select {title}
              </Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 10 }}>
              {owned.map((it) => (
                <Pressable
                  key={it.id}
                  onPress={() => handleSelect(it.id)}
                  style={({ pressed }) => ({
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: it.id === equipped ? "#22c55e" : "#334155",
                    backgroundColor: pressed ? "#0a1621" : palette.card,
                    marginBottom: 10,
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
                  {!!it.description && (
                    <Text
                      style={{
                        color: palette.subtext,
                        marginTop: 4,
                        fontSize: 12,
                      }}
                      numberOfLines={2}
                    >
                      {it.description}
                    </Text>
                  )}
                </Pressable>
              ))}
              {!owned.length && (
                <View style={{ padding: 14 }}>
                  <Text style={{ color: palette.subtext }}>
                    You don’t own any {title.toLowerCase()} yet.
                  </Text>
                </View>
              )}
            </ScrollView>
            <View
              style={{
                padding: 10,
                borderTopWidth: 1,
                borderTopColor: "#162133",
                alignItems: "flex-end",
              }}
            >
              <Pressable
                onPress={() => setOpen(false)}
                style={({ pressed }) => ({
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#334155",
                  backgroundColor: pressed ? "#0a1621" : palette.card,
                })}
              >
                <Text style={{ color: "#cbd5e1", fontWeight: "700" }}>
                  Close
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
