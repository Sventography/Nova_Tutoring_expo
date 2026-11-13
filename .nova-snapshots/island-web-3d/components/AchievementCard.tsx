import * as React from "react";
import { View, Text, StyleSheet } from "react-native";

export type Achievement = {
  id: string;
  title: string;
  description?: string;
  points?: number;
  unlocked?: boolean;
};

export default function AchievementCard({ item }: { item: Achievement }) {
  return (
    <View style={[styles.card, item.unlocked ? styles.unlocked : styles.locked]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{item.title}</Text>
        {typeof item.points === "number" ? (
          <Text style={styles.points}>🏅 {item.points}</Text>
        ) : null}
      </View>
      {item.description ? (
        <Text style={styles.desc}>{item.description}</Text>
      ) : null}
      {!item.unlocked ? <Text style={styles.lockTag}>Locked</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    marginHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  unlocked: { opacity: 1 },
  locked: { opacity: 0.65 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  title: { color: "#eaf7fb", fontWeight: "800", fontSize: 16 },
  points: { color: "#cfe8ef", fontWeight: "700" },
  desc: { color: "#cfe8ef", opacity: 0.9, marginTop: 2 },
  lockTag: { color: "#ffb3b3", marginTop: 8, fontWeight: "600" },
});
