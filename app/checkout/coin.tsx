import React, { useState } from "react";
import { SafeAreaView, ScrollView, View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCoins } from "../context/CoinsContext";

export default function CheckoutCoins() {
  const { itemId = "", title = "Item", cost = "0", size = "" } =
    useLocalSearchParams<{ itemId?: string; title?: string; cost?: string; size?: string }>();

  const router = useRouter();
  const { coins, set } = useCoins();

  const price = Math.max(0, parseInt(String(cost), 10) || 0);
  const canAfford = coins >= price;

  const [busy, setBusy] = useState(false);

  const handlePlaceOrder = async () => {
    if (busy || !canAfford) return;
    setBusy(true);
    try {
      // deduct coins
      await set(coins - price);

      // TODO: record the order locally if desired

      // simple success route back to shop for now
      router.replace("/(tabs)/shop");
    } finally {
      setBusy(false);
    }
  };

  const fields = [
    "Email *",
    "Full Name *",
    "Phone",
    "Address line 1 *",
    "Address line 2",
    "City *",
    "State *",
    "ZIP *",
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "black" }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        <Text style={{ color: "white", fontSize: 22, fontWeight: "800" }}>Checkout (Coins)</Text>
        <Text style={{ color: "#80dfff", textDecorationLine: "underline" }}>{title}</Text>
        {size ? <Text style={{ color: "#cbd5e1" }}>Size: {String(size)}</Text> : null}
        <Text style={{ color: "white" }}>Cost: {price.toLocaleString()} coins</Text>
        <Text style={{ color: "white" }}>Balance: {Number(coins||0).toLocaleString()} coins</Text>

        {fields.map((label, i) => (
          <View key={i} style={{ gap: 6 }}>
            <Text style={{ color: "#cbd5e1" }}>{label}</Text>
            <TextInput
              placeholder={label}
              placeholderTextColor="#6b7280"
              style={{
                backgroundColor: "#0f172a",
                color: "white",
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(0,229,255,0.35)",
              }}
            />
          </View>
        ))}

        <Pressable
          onPress={handlePlaceOrder}
          disabled={busy || !canAfford}
          style={({ pressed }) => ({
            marginTop: 8,
            opacity: !canAfford ? 0.6 : pressed ? 0.85 : 1,
            backgroundColor: "#16a34a",
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
          })}
        >
          {busy ? (
            <ActivityIndicator />
          ) : (
            <Text style={{ color: "white", fontWeight: "800" }}>
              {canAfford ? "Place Order" : "Not enough coins"}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          style={{ paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: "#334155" }}
        >
          <Text style={{ color: "white" }}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
