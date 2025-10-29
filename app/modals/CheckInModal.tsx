import React from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenBG from "@/components/ScreenBG";
import * as Haptics from "expo-haptics";
import { onDailyCheckIn } from "../achievements/api";
export default function CheckInModal({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const onCheck = async () => {
    await onDailyCheckIn();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };
  return (
    <ScreenBG>
      <View style={{ paddingTop: insets.top + 40, paddingHorizontal: 24 }}>
        <Text style={{ color: "#222", fontSize: 26, fontWeight: "800" }}>
          Daily Check-in
        </Text>
        <Text style={{ color: "#444", marginTop: 6 }}>
          Claim your daily glow and keep your streak alive
        </Text>
        <Pressable
          onPress={onCheck}
          style={{
            marginTop: 20,
            backgroundColor: "#ff65a3",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 14,
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>Check In</Text>
        </Pressable>
        <Pressable onPress={onClose} style={{ marginTop: 12 }}>
          <Text style={{ color: "#444" }}>Maybe later</Text>
        </Pressable>
      </View>
    </ScreenBG>
  );
}
