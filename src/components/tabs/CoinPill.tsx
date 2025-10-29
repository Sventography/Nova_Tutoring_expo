import React, { useCallback, useEffect, useState } from "react";
import bus from "../../lib/bus";
import { useThemeColors } from "../../providers/ThemeBridge";
import { View, Text } from "react-native";
import { getCoins } from "../../lib/wallet";
import { useFocusEffect } from "@react-navigation/native";

export function CoinPill() {
  const palette = useThemeColors();
  const [coins, setCoins] = useState(0);
  const load = useCallback(async () => {
    setCoins(await getCoins());
  }, []);
  useEffect(() => {
    load();
    const h = () => load();
    bus.on("wallet_changed", h);
    return () => bus.off("wallet_changed", h);
  }, []);
  useFocusEffect(
    React.useCallback(() => {
      load();
    }, []),
  );
  return (
    <View
      variant="bg"
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: palette.accent,
        backgroundColor: "#06121a",
      }}
    >
      <Text style={{ color: "#a5f3fc", fontWeight: "800" }}>{coins} coins</Text>
    </View>
  );
}
