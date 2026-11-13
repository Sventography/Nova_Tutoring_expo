// app/components/QuickRow.tsx
import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useTheme } from "../context/ThemeContext";

type QuickItem = {
  id: string;
  name: string;
  kind: "theme" | "cursor";
  owned?: boolean;
  equipped?: boolean;
};

type Props = {
  title: string;
  items: QuickItem[];
  onEquip: (id: string, kind: "theme" | "cursor") => void;
  onBuy: (id: string) => void;
};

export default function QuickRow({ title, items, onEquip, onBuy }: Props) {
  const { tokens } = useTheme();

  return (
    <View style={{ marginBottom: 12 }}>
      <Text
        style={{
          color: tokens.titleText as any,
          fontSize: 14,
          fontWeight: "800",
          marginBottom: 6,
        }}
      >
        {title}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {items.map((item) => {
          const owned = !!item.owned;
          const equipped = !!item.equipped;

          return (
            <View
              key={item.id}
              style={{
                borderWidth: 1,
                borderColor: tokens.accent,
                borderRadius: 14,
                padding: 10,
                marginRight: 10,
                minWidth: 130,
                alignItems: "center",
                backgroundColor: tokens.isDark
                  ? "rgba(0,0,0,0.4)"
                  : "rgba(255,255,255,0.7)",
              }}
            >
              <Text
                style={{
                  color: tokens.cardText,
                  fontWeight: "700",
                  marginBottom: 6,
                  textAlign: "center",
                }}
                numberOfLines={2}
              >
                {item.name}
              </Text>

              {owned ? (
                <Pressable
                  onPress={() => onEquip(item.id, item.kind)}
                  style={({ pressed }) => ({
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: tokens.accent,
                    backgroundColor: pressed
                      ? tokens.isDark
                        ? "rgba(92,252,200,0.2)"
                        : "rgba(62,211,162,0.2)"
                      : tokens.isDark
                      ? "rgba(92,252,200,0.12)"
                      : "rgba(62,211,162,0.12)",
                  })}
                >
                  <Text
                    style={{
                      color: tokens.cardText,
                      fontWeight: "800",
                    }}
                  >
                    {equipped ? "Equipped ✓" : "Equip"}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => onBuy(item.id)}
                  style={({ pressed }) => ({
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: tokens.muted as any,
                    backgroundColor: pressed
                      ? "rgba(148,163,184,0.15)"
                      : "transparent",
                  })}
                >
                  <Text
                    style={{
                      color: tokens.muted as any,
                      fontWeight: "700",
                    }}
                  >
                    🔒 Unlock
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
