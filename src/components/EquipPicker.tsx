import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, Image, ScrollView } from "react-native";

export type EquipItem = {
  id: string;
  label: string;
  icon?: any;          // require("...png") or { uri }
  disabled?: boolean;
};

type Props = {
  title?: string;
  items: EquipItem[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  horizontal?: boolean;
};

export default function EquipPicker({
  title = "Pick your fit",
  items,
  selectedId = null,
  onSelect,
  horizontal = true,
}: Props) {
  const content = useMemo(
    () =>
      items.map((it) => {
        const active = it.id === selectedId;
        const base = {
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 14,
          marginRight: 10,
          marginBottom: horizontal ? 0 : 10,
          borderWidth: 1,
          borderColor: active ? "#06b6d4" : "#1f2937",
          backgroundColor: active ? "rgba(14,165,233,0.12)" : "rgba(2,6,23,0.6)",
          opacity: it.disabled ? 0.5 : 1,
        } as const;

        return (
          <TouchableOpacity
            key={it.id}
            style={base}
            disabled={it.disabled}
            onPress={() => onSelect && onSelect(it.id)}
            accessibilityRole="button"
            accessibilityState={{ disabled: !!it.disabled, selected: active }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {it.icon ? (
                <Image source={it.icon} style={{ width: 22, height: 22, borderRadius: 6 }} />
              ) : null}
              <Text style={{ color: active ? "#e0f2fe" : "#e5e7eb", fontWeight: active ? "700" : "500" }}>
                {it.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      }),
    [items, selectedId, onSelect, horizontal]
  );

  return (
    <View style={{ gap: 10 }}>
      {!!title && <Text style={{ color: "#93c5fd", fontSize: 16, fontWeight: "700" }}>{title}</Text>}
      {horizontal ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
          {content}
        </ScrollView>
      ) : (
        <View style={{ flexDirection: "column" }}>{content}</View>
      )}
    </View>
  );
}
