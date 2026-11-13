import React, { useRef, useState } from "react";
import { View, Text, Pressable, Animated, Easing } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import Ionicons from "@expo/vector-icons/Ionicons";

const KEYS = {
  shop: "shop_state_v1",
  achievements: "achievements_state_v1",
  flashcards: "saved_flashcards_v1",
};

export default function DevPanel() {
  const [open, setOpen] = useState(false);
  const y = useRef(new Animated.Value(120)).current;
  const op = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    Animated.parallel([
      Animated.timing(y, {
        toValue: next ? 0 : 120,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(op, {
        toValue: next ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  };

  const Button = ({
    label,
    onPress,
  }: {
    label: string;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: "rgba(255,255,255,0.95)",
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.1)",
        marginTop: 8,
      }}
    >
      <Text style={{ color: "#111", fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );

  const addCoins = async (n: number) => {
    try {
      const raw = await AsyncStorage.getItem(KEYS.shop);
      const state = raw
        ? JSON.parse(raw)
        : { balance: 0, owned: {}, equipped: {} };
      const next = { ...state, balance: (state.balance || 0) + n };
      await AsyncStorage.setItem(KEYS.shop, JSON.stringify(next));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const resetKey = async (k: string) => {
    try {
      await AsyncStorage.removeItem(k);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  return (
    <>
      <Pressable
        onLongPress={toggle}
        style={{
          position: "absolute",
          right: 10,
          bottom: 10,
          width: 38,
          height: 38,
          borderRadius: 19,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="construct-outline" size={22} color="rgba(0,0,0,0.15)" />
      </Pressable>

      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        style={{
          position: "absolute",
          right: 12,
          bottom: 60,
          transform: [{ translateY: y }],
          opacity: op,
          alignItems: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.97)",
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: "rgba(0,0,0,0.1)",
            width: 250,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="hammer-outline" size={18} color="#ff65a3" />
            <Text style={{ color: "#111", fontWeight: "800" }}>Dev Panel</Text>
          </View>

          <Button label="+100 Coins" onPress={() => addCoins(100)} />
          <Button label="+1000 Coins" onPress={() => addCoins(1000)} />
          <Button
            label="Reset Shop State"
            onPress={() => resetKey(KEYS.shop)}
          />
          <Button
            label="Reset Achievements"
            onPress={() => resetKey(KEYS.achievements)}
          />
          <Button
            label="Reset Flashcards"
            onPress={() => resetKey(KEYS.flashcards)}
          />

          <Pressable
            onPress={toggle}
            style={{ marginTop: 10, alignSelf: "flex-end" }}
          >
            <Text style={{ color: "#555" }}>Close</Text>
          </Pressable>
        </View>
      </Animated.View>
    </>
  );
}
