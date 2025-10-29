import React from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = { colors?: string[]; children: React.ReactNode };
export default function GradientBg({ colors = ["#000000","#03121A"], children }: Props) {
  return (
    <LinearGradient colors={colors} style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>{children}</View>
    </LinearGradient>
  );
}
