import React from "react";
import { View, Text } from "react-native";

export default function CertificateCanvas({
  username,
  topic,
  score,
  total,
  dateISO,
}: {
  username: string;
  topic: string;
  score: number;
  total: number;
  dateISO: string;
}) {
  return (
    <View
      style={{
        width: 900,
        height: 600,
        backgroundColor: "#0b0f14",
        borderWidth: 8,
        borderColor: "#38bdf8",
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 36,
          fontWeight: "800",
          marginBottom: 8,
        }}
      >
        Nova Tutoring
      </Text>
      <Text
        style={{
          color: "#93c5fd",
          fontSize: 28,
          fontWeight: "700",
          marginBottom: 24,
        }}
      >
        Certificate of Mastery
      </Text>
      <Text style={{ color: "white", fontSize: 22, marginBottom: 6 }}>
        Awarded to
      </Text>
      <Text
        style={{
          color: "#fef08a",
          fontSize: 34,
          fontWeight: "900",
          marginBottom: 16,
        }}
      >
        {username}
      </Text>
      <Text style={{ color: "white", fontSize: 18, marginBottom: 6 }}>
        for completing
      </Text>
      <Text
        style={{
          color: "#a5b4fc",
          fontSize: 26,
          fontWeight: "800",
          marginBottom: 16,
        }}
      >
        {topic}
      </Text>
      <Text style={{ color: "white", fontSize: 18, marginBottom: 6 }}>
        Score
      </Text>
      <Text
        style={{
          color: "#bbf7d0",
          fontSize: 30,
          fontWeight: "900",
          marginBottom: 20,
        }}
      >
        {score} / {total}
      </Text>
      <Text style={{ color: "#94a3b8", fontSize: 14 }}>
        Issued {new Date(dateISO).toLocaleString()}
      </Text>
    </View>
  );
}
