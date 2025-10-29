import React from "react";
import { View, Alert } from "react-native";
import ChameleonButton from "./ChameleonButton";
export default function DonateButtons() {
  const onTap = (amt: string) => Alert.alert("Thanks!", `Donation ${amt}`);
  return (
    <View variant="bg" style={{ gap: 12, alignSelf: "stretch" }}>
      <ChameleonButton label="$2" onPress={() => onTap("$2")} />
      <ChameleonButton label="$5" onPress={() => onTap("$5")} />
      <ChameleonButton label="$10" onPress={() => onTap("$10")} />
    </View>
  );
}
