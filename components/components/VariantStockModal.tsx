import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  Platform,
  ScrollView,
} from "react-native";
import { useThemeColors } from "../providers/ThemeBridge";
import { listVariantStock, adjustStock } from "../lib/inventory";
import { showToast } from "../lib/toast";

type Props = {
  visible: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle: string;
};

export default function VariantStockModal({
  visible,
  onClose,
  itemId,
  itemTitle,
}: Props) {
  const palette = useThemeColors();
  const [rows, setRows] = React.useState<Record<string, number>>({});
  const [loading, setLoading] = React.useState(false);

  async function load() {
    setLoading(true);
    const m = await listVariantStock(itemId);
    setRows(m);
    setLoading(false);
  }
  React.useEffect(() => {
    if (visible) load();
  }, [visible]);

  async function bump(label: string, delta: number) {
    const key = ["S", "M", "L", "XL", "2XL"].includes(label)
      ? { size: label }
      : { model: label };
    await adjustStock(itemId, delta, key as any);
    await load();
    showToast(
      delta > 0 ? `+${delta} to ${label}` : `${delta} ${label}`,
      "success",
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 520,
            backgroundColor: palette.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: palette.border,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: Platform.OS === "ios" ? 14 : 10,
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: palette.border,
            }}
          >
            <Text
              style={{ color: palette.text, fontSize: 20, fontWeight: "900" }}
            >
              Variant Stock
            </Text>
            <Text style={{ color: palette.subtext, marginTop: 4 }}>
              {itemTitle}
            </Text>
          </View>
          <ScrollView style={{ maxHeight: 420 }}>
            <View style={{ padding: 16, gap: 12 }}>
              {Object.keys(rows).length ? (
                Object.entries(rows).map(([label, n]) => (
                  <View
                    key={label}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: palette.text, fontWeight: "800" }}>
                      {label}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            n <= 0 ? "#ef4444" : n <= 5 ? "#f59e0b" : "#86efac",
                          fontWeight: "900",
                          minWidth: 56,
                          textAlign: "right",
                        }}
                      >
                        {n <= 0 ? "Sold Out" : n}
                      </Text>
                      <Pressable
                        onPress={() => bump(label, +1)}
                        style={({ pressed }) => ({
                          paddingVertical: 6,
                          paddingHorizontal: 8,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: "#22d3ee",
                          backgroundColor: pressed ? "#05202a" : "#06121a",
                        })}
                      >
                        <Text style={{ color: "#22d3ee", fontWeight: "900" }}>
                          +1
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => bump(label, +5)}
                        style={({ pressed }) => ({
                          paddingVertical: 6,
                          paddingHorizontal: 8,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: "#22d3ee",
                          backgroundColor: pressed ? "#05202a" : "#06121a",
                        })}
                      >
                        <Text style={{ color: "#22d3ee", fontWeight: "900" }}>
                          +5
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => bump(label, +10)}
                        style={({ pressed }) => ({
                          paddingVertical: 6,
                          paddingHorizontal: 8,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: "#22d3ee",
                          backgroundColor: pressed ? "#05202a" : "#06121a",
                        })}
                      >
                        <Text style={{ color: "#22d3ee", fontWeight: "900" }}>
                          +10
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={{ color: palette.subtext }}>
                  {loading ? "Loading…" : "No variants tracked yet"}
                </Text>
              )}
            </View>
          </ScrollView>
          <View
            style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: palette.border,
              alignItems: "flex-end",
            }}
          >
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: palette.border,
                backgroundColor: pressed ? "#0a1621" : palette.card,
              })}
            >
              <Text style={{ color: palette.subtext, fontWeight: "800" }}>
                Close
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
