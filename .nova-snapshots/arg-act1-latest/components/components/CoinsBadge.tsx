import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { getBalance } from "../lib/coins";

export default function CoinsBadge() {
  const [bal, setBal] = useState<number>(0);
  async function refresh() {
    const r = await getBalance("default");
    setBal(r.balance || 0);
  }
  useEffect(() => {
    refresh();
  }, []);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text style={{ fontSize: 16, fontWeight: "700" }}>Coins: {bal}</Text>
      <Pressable
        onPress={refresh}
        style={{
          paddingVertical: 6,
          paddingHorizontal: 10,
          borderWidth: 1,
          borderRadius: 999,
        }}
      >
        <Text>Refresh</Text>
      </Pressable>
    </View>
  );
}
