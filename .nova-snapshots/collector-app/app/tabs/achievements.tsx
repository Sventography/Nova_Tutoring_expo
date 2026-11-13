import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { useAchievements } from "../context/AchievementsContext";

export default function AchievementsScreen() {
  const { achievements } = useAchievements();

  return (
    <View style={S.container}>
      <Text style={S.title}>Achievements</Text>
      <FlatList
        data={achievements}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={S.card}>
            <Text style={S.cardName}>{item.title}</Text>
            <Text style={S.cardDesc}>{item.description}</Text>
            <View style={S.cardMetaRow}>
              <Text style={S.badge}>{item.difficulty}</Text>
              <Text style={S.points}>+{item.points} pts</Text>
              {item.unlocked && <Text style={S.unlocked}>Unlocked</Text>}
            </View>
          </View>
        )}
      />
    </View>
  );
}

export const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#06121a", padding: 12 },
  title: { color: "#e8fbff", fontSize: 22, fontWeight: "900", marginBottom: 8 },
  card: {
    flex: 1,
    backgroundColor: "#0b2030",
    borderWidth: 1,
    borderColor: "#123",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  cardName: { color: "#e8fbff", fontWeight: "900", marginBottom: 6 },
  cardDesc: { color: "#98c7d1", fontSize: 12, minHeight: 36 },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  badge: {
    color: "#fcefff",
    fontSize: 10,
    opacity: 0.9,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
  },
  points: { marginLeft: "auto", color: "#00e5ff", fontWeight: "900" },
  unlocked: { color: "#8bffa4", fontWeight: "900", marginLeft: 8 },
});
