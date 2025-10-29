import React from "react";
import { View, Text, StyleSheet } from "react-native";

type Achievement = { title: string; desc?: string };
type Props = { item: Achievement; unlocked?: boolean };

export default function AchievementCard({ item, unlocked = false }: Props) {
  if (!item) return null;
  return (
    <View variant="bg" style={[styles.card, unlocked && styles.cardOn]}>
      <Text
        style={[styles.title, unlocked && styles.titleOn]}
        numberOfLines={2}
      >
        {item.title}
      </Text>
      {item.desc ? (
        <Text style={styles.desc} numberOfLines={2}>
          {item.desc}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 100,
    height: 110,
    margin: 8,
    borderWidth: 2,
    borderColor: "#0ff",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111",
  },
  cardOn: { borderColor: "#8ff" },
  title: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0ff",
    textAlign: "center",
  },
  titleOn: { color: "#aff" },
  desc: {
    marginTop: 4,
    fontSize: 11,
    color: "#9fe",
    textAlign: "center",
    paddingHorizontal: 6,
  },
});
