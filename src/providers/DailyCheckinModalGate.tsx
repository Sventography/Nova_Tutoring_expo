import React, { useEffect, useState } from "react";
import { Modal, View, Text, Pressable, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { addCoins } from "../lib/wallet";
import bus from "../lib/bus";
import { useThemeColors } from "./../providers/ThemeBridge";

const K_LAST = "daily.last_checkin";
const K_STREAK = "daily.streak";

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function DailyCheckinModalGate() {
  const palette = useThemeColors();
  const [visible, setVisible] = useState(false);
  const [streak, setStreak] = useState(0);

  async function shouldShow() {
    const lastStr = await AsyncStorage.getItem(K_LAST);
    const s = parseInt((await AsyncStorage.getItem(K_STREAK)) || "0", 10) || 0;
    const today = new Date();
    let show = true;
    if (lastStr) {
      const last = new Date(lastStr);
      if (sameDay(last, today)) show = false;
    }
    setStreak(s);
    setVisible(show);
  }

  useEffect(() => {
    shouldShow();
  }, []);

  async function claim() {
    const today = new Date();
    const lastStr = await AsyncStorage.getItem(K_LAST);
    let s = parseInt((await AsyncStorage.getItem(K_STREAK)) || "0", 10) || 0;

    if (lastStr) {
      const last = new Date(lastStr);
      const diff = Math.floor((today.getTime() - last.getTime()) / 86400000);
      if (diff === 1) s += 1;
      else if (!sameDay(last, today)) s = 1;
    } else {
      s = 1;
    }

    let reward = 25;
    if (s > 0 && s % 7 === 0) reward += 50;

    await addCoins(reward);
    await AsyncStorage.setItem(K_LAST, today.toISOString());
    await AsyncStorage.setItem(K_STREAK, String(s));
    bus.emit("wallet_changed");
    setVisible(false);
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={() => setVisible(false)}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 520,
            borderRadius: 20,
            backgroundColor: palette.card,
            borderWidth: 2,
            borderColor: palette.accent,
            shadowOpacity: 0.6,
            shadowRadius: 28,
            shadowOffset: { width: 0, height: 12 },
          }}
        >
          <View
            style={{
              padding: 18,
              borderBottomWidth: 1,
              borderBottomColor: palette.border,
              backgroundColor:
                Platform.OS === "web" ? "transparent" : palette.card,
            }}
          >
            <Text
              style={{ color: palette.text, fontSize: 22, fontWeight: "900" }}
            >
              Daily Check-In
            </Text>
            <Text style={{ color: "#9bb7e0", marginTop: 6 }}>
              Streak: {streak} day{streak === 1 ? "" : "s"} • +25 coins daily
              {streak > 0 && streak % 7 === 0 ? " +50 bonus!" : ""}
            </Text>
          </View>

          <View style={{ padding: 18 }}>
            <View
              style={{
                borderRadius: 16,
                padding: 14,
                borderWidth: 1,
                borderColor: palette.accent,
                backgroundColor: "#06121a",
              }}
            >
              <Text style={{ color: palette.accent, fontWeight: "800" }}>
                Claim today’s reward
              </Text>
              <Text style={{ color: palette.text, marginTop: 6 }}>
                Tap Claim to add coins now.
              </Text>
            </View>

            <View style={{ height: 16 }} />

            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <Pressable
                onPress={() => setVisible(false)}
                style={({ pressed }) => ({
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: palette.border,
                  backgroundColor: pressed ? "#0a1621" : palette.card,
                  marginRight: 10,
                })}
              >
                <Text style={{ color: "#9bb7e0", fontWeight: "700" }}>
                  Later
                </Text>
              </Pressable>
              <Pressable
                onPress={claim}
                style={({ pressed }) => ({
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: palette.accent,
                  backgroundColor: pressed ? "#07131d" : "#06121a",
                })}
              >
                <Text style={{ color: palette.accent, fontWeight: "900" }}>
                  Claim +25
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
