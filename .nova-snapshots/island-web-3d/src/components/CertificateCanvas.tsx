import React from "react";
import { View, Text } from "react-native";

type Props = {
  title?: string;
  username?: string;
  score?: number | string;
  date?: string;
  width?: number;
  height?: number;
  style?: any;
};

export const CertificateCanvas = ({
  title = "Certificate of Achievement",
  username = "Learner",
  score = "",
  date,
  width = 340,
  height = 220,
  style,
}: Props) => {
  return (
    <View style={[{ width, height, backgroundColor: "#0b0f19", borderRadius: 16, overflow: "hidden" }, style]}>
      <View style={{ position: "absolute", inset: 0, borderWidth: 2, borderColor: "#38bdf8", borderRadius: 16 }} />
      <View style={{ position: "absolute", inset: 8, borderWidth: 2, borderColor: "#0ea5e9", borderRadius: 12 }} />
      <View style={{ flex: 1, padding: 16, justifyContent: "center", alignItems: "center", gap: 6 }}>
        <Text style={{ color: "#93c5fd", fontSize: 14, letterSpacing: 1.5 }}>★ OFFICIAL ★</Text>
        <Text style={{ color: "#e5e7eb", fontSize: 18, fontWeight: "800", marginTop: 2, textAlign: "center" }}>{title}</Text>
        <Text style={{ color: "#a5b4fc", fontSize: 16, marginTop: 6 }}>Awarded to</Text>
        <Text style={{ color: "#f0f9ff", fontSize: 20, fontWeight: "800", marginTop: 2 }}>{username}</Text>
        {String(score).length ? (
          <Text style={{ color: "#67e8f9", fontSize: 16, marginTop: 4 }}>Score: {score}%</Text>
        ) : null}
        <Text style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>{date ?? new Date().toLocaleDateString()}</Text>
      </View>
    </View>
  );
};

export default CertificateCanvas;
