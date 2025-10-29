import React from "react";
import { View, Text } from "react-native";

type Props = {
  title: string;
  score: number;
};

export default function CertificateRow({ title, score }: Props) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 12, borderBottomWidth: 1, borderBottomColor: "#222" }}>
      <Text style={{ color: "#fff", fontSize: 16 }}>{title}</Text>
      <Text style={{ color: "#00ffff", fontSize: 16 }}>{score}%</Text>
    </View>
  );
}
