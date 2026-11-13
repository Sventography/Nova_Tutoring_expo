import React from "react";
import { View, Text } from "react-native";

export default function CertificateView({
  name, topic, score, total, earnedAt, styleVariant = "neon"
}: { name: string; topic: string; score: number; total: number; earnedAt: number; styleVariant?: "neon" | "classic"; }) {
  return (
    <View style={{
      backgroundColor: styleVariant === "neon" ? "#031224" : "#fff",
      borderColor: styleVariant === "neon" ? "#00e5ff" : "#222",
      borderWidth: 2, borderRadius: 16, padding: 20, width: "100%", minHeight: 220
    }}>
      <Text style={{ color: styleVariant==="neon" ? "#67e8f9" : "#111", fontSize: 20, fontWeight: "900", textAlign: "center" }}>
        Certificate of Mastery
      </Text>
      <Text style={{ color: styleVariant==="neon" ? "#baf8ff" : "#222", marginTop: 10, textAlign: "center" }}>
        Presented to
      </Text>
      <Text style={{ color: styleVariant==="neon" ? "#e6fcff" : "#000", fontSize: 24, fontWeight: "900", textAlign: "center", marginTop: 4 }}>
        {name}
      </Text>
      <Text style={{ color: styleVariant==="neon" ? "#baf8ff" : "#333", marginTop: 12, textAlign: "center" }}>
        For demonstrating proficiency in
      </Text>
      <Text style={{ color: styleVariant==="neon" ? "#e6fcff" : "#111", fontSize: 18, fontWeight: "800", textAlign: "center", marginTop: 4 }}>
        {topic}
      </Text>
      <Text style={{ color: styleVariant==="neon" ? "#7ad9e6" : "#444", marginTop: 10, textAlign: "center" }}>
        Score: {score}/{total} · {new Date(earnedAt).toLocaleDateString()}
      </Text>
    </View>
  );
}

