import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";

type Props = {
  title: string;
  description?: string;
  icon?: any;
  unlocked?: boolean;
};

export default function AchievementCard({ title, description, icon, unlocked }: Props) {
  return (
    <View style={[styles.card, unlocked ? styles.unlocked : styles.locked]}>
      {icon && <Image source={icon} style={styles.icon} />}
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {description && <Text style={styles.desc}>{description}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  unlocked: {
    backgroundColor: "rgba(0, 229, 255, 0.1)",
    borderColor: "#00e5ff",
  },
  locked: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.2)",
  },
  icon: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 8,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#cfe8ef",
  },
  desc: {
    fontSize: 13,
    color: "#98c7d1",
    marginTop: 2,
  },
});
