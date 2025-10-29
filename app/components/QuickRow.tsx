import React from "react";
import { View, Text, Pressable, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type QuickItem = {
  id: string;
  name: string;
  kind: "theme" | "cursor";
  owned: boolean;
  equipped: boolean;
};

function Card({
  it,
  onEquip,
  onBuy,
}: {
  it: QuickItem;
  onEquip: (id: string, kind: "theme" | "cursor") => void;
  onBuy?: (id: string) => void;
}) {
  const iconName = it.kind === "theme" ? "color-palette" : "sparkles";
  return (
    <View
      style={{
        width: 140,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: it.equipped ? "#5cfcc8" : "rgba(0,229,255,0.5)",
        backgroundColor: "rgba(0,229,255,0.08)",
        padding: 12,
        marginRight: 12,
      }}
    >
      <View
        style={{
          height: 80,
          borderRadius: 12,
          backgroundColor: "rgba(0,0,0,0.25)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        <Ionicons name={iconName} size={28} color="#00e5ff" />
        {!it.owned && (
          <Ionicons
            name="lock-closed"
            size={18}
            color="#8aa7af"
            style={{ position: "absolute", top: 8, right: 8 }}
          />
        )}
      </View>

      <Text numberOfLines={1} style={{ color: "#e6f7ff", fontSize: 14, fontWeight: "700" }}>
        {it.name}
      </Text>

      {it.owned ? (
        <Pressable
          onPress={() => onEquip(it.id, it.kind)}
          style={({ pressed }) => ({
            marginTop: 8,
            paddingVertical: 8,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#5cfcc8",
            backgroundColor: pressed ? "rgba(92,252,200,0.15)" : "rgba(92,252,200,0.08)",
          })}
        >
          <Text style={{ color: "#5cfcc8", fontWeight: "800", textAlign: "center" }}>
            {it.equipped ? "Equipped" : "Equip"}
          </Text>
        </Pressable>
      ) : onBuy ? (
        <Pressable
          onPress={() => onBuy(it.id)}
          style={({ pressed }) => ({
            marginTop: 8,
            paddingVertical: 8,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#00e5ff",
            backgroundColor: pressed ? "rgba(0,229,255,0.18)" : "rgba(0,229,255,0.10)",
          })}
        >
          <Text style={{ color: "#00e5ff", fontWeight: "800", textAlign: "center" }}>Unlock</Text>
        </Pressable>
      ) : (
        <View
          style={{
            marginTop: 8,
            paddingVertical: 8,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.15)",
            backgroundColor: "rgba(255,255,255,0.05)",
          }}
        >
          <Text style={{ color: "#8aa7af", fontWeight: "700", textAlign: "center" }}>Locked</Text>
        </View>
      )}
    </View>
  );
}

export default function QuickRow({
  title,
  items,
  onEquip,
  onBuy,
}: {
  title: string;
  items: QuickItem[];
  onEquip: (id: string, kind: "theme" | "cursor") => void;
  onBuy?: (id: string) => void;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          marginBottom: 8,
        }}
      >
        <Text style={{ color: "#cfeaf0", fontSize: 18, fontWeight: "800" }}>
          {title}
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => <Card it={item} onEquip={onEquip} onBuy={onBuy} />}
        horizontal
        // important bits for scrolling in vertical ScrollView (native + web)
        scrollEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}                 // prevents taking vertical space
        contentContainerStyle={{ paddingHorizontal: 16, paddingRight: 4 }} // small tail pad so last card isn't clipped
        // performance niceties:
        initialNumToRender={6}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </View>
  );
}
