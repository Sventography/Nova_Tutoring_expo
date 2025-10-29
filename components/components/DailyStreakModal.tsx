import React from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
export default function DailyStreakModal({
  visible,
  Streak,
  onClose,
}: {
  visible: boolean;
  Streak: number;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.backdrop}>
        <View style={s.card}>
          <Text style={s.title}>Streak: {Streak} days</Text>
          <Pressable onPress={onClose} style={s.btn}>
            <Text style={s.btnT}>OK</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  card: {
    width: "88%",
    maxWidth: 380,
    borderWidth: 2,
    borderColor: "#0ff",
    borderRadius: 16,
    backgroundColor: "#0b0b16",
    padding: 18,
  },
  title: {
    color: "#cfe6ff",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 12,
  },
  btn: {
    alignSelf: "center",
    marginTop: 8,
    borderWidth: 2,
    borderRadius: 10,
    borderColor: "#0ff",
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#111",
  },
  btnT: { color: "#0ff", fontWeight: "800" },
});
