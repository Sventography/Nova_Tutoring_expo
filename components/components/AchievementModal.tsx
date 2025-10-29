import React, { useEffect } from "react";
import { Modal, View, Text, StyleSheet } from "react-native";

type Props = { visible: boolean; title: string; onHide: () => void };

export default function AchievementModal({ visible, title, onHide }: Props) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onHide, 2200);
    return () => clearTimeout(t);
  }, [visible]);
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onHide}
    >
      <View style={s.backdrop}>
        <View style={s.card}>
          <Text style={s.h1}>ACHIEVEMENT UNLOCKED</Text>
          <Text style={s.name}>{title}</Text>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  card: {
    minWidth: 280,
    maxWidth: "85%",
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#ff00a8",
    borderWidth: 3,
    borderColor: "#00ffcc",
    shadowColor: "#00ffcc",
    shadowOpacity: 0.9,
    shadowRadius: 18,
    elevation: 10,
  },
  h1: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    color: "#00e1ff",
    textShadowColor: "#00ff66",
    textShadowRadius: 12,
    marginBottom: 8,
  },
  name: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "900",
    color: "#39ff14",
    textShadowColor: "#00e1ff",
    textShadowRadius: 10,
  },
});
