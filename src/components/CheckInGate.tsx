import React from "react";
import { View } from "react-native";
type Props = { children: React.ReactNode };
export default function CheckInGate({ children }: Props) {
  return <View style={{ flex: 1 }}>{children}</View>;
}
