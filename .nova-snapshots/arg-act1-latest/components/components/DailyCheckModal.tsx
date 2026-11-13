import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useContextSafe } from "@/context/StreakContext";

export default function DailyCheckModal() {
  const { showModal, Streak, checkIn, dismiss } = useContextSafe();
  return (
    <Modal visible={showModal} transparent animationType="fade">
      <View style={s.backdrop}>
        <LinearGradient
          colors={["#0ff", "#7af", "#0ff"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.card}
        >
          <Text style={s.title}>Daily Check-In</Text>
          <Text style={s.sub}>
            Current Streak: <Text style={s.num}>{Streak}</Text> day
            {Streak === 1 ? "" : "s"}
          </Text>
          <TouchableOpacity style={s.btn} onPress={checkIn}>
            <Text style={s.btnT}>I’m here today</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.skip} onPress={dismiss}>
            <Text style={s.skipT}>Later</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#00ffff55",
  },
  title: { color: "#002", fontSize: 22, fontWeight: "900", marginBottom: 8 },
  sub: { color: "#012", fontSize: 16, marginBottom: 16 },
  num: { fontWeight: "900" },
  btn: {
    backgroundColor: "#000",
    borderWidth: 2,
    borderColor: "#0ff",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnT: { color: "#0ff", fontWeight: "900", fontSize: 16 },
  skip: { marginTop: 10, alignItems: "center" },
  skipT: { color: "#013", fontWeight: "700" },
});
