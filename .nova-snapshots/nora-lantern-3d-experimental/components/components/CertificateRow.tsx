import React from "react";
import { View, Text, Image, Pressable } from "react-native";
import { CertificateRecord } from "../types/certificate";
import { useCertificates } from "../context/CertificatesContext";

export default function CertificateRow({ rec }: { rec: CertificateRecord }) {
  const { deleteById, shareImageUri } = useCertificates();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderBottomWidth: 1,
        borderColor: "#1f2937",
        gap: 12,
      }}
    >
      <Image
        source={{ uri: rec.imageUri }}
        style={{
          width: 120,
          height: 80,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "#334155",
        }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ color: "white", fontWeight: "800" }}>{rec.topic}</Text>
        <Text style={{ color: "#9ca3af" }}>
          {rec.username} • {rec.score}/{rec.total} •{" "}
          {new Date(rec.dateISO).toLocaleString()}
        </Text>
      </View>
      <Pressable
        onPress={() => shareImageUri(rec.imageUri)}
        style={{
          backgroundColor: "#2563eb",
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 999,
        }}
      >
        <Text style={{ color: "white", fontWeight: "800" }}>Share</Text>
      </Pressable>
      <Pressable
        onPress={() => deleteById(rec.id)}
        style={{
          backgroundColor: "#111827",
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: "#374151",
        }}
      >
        <Text style={{ color: "#fca5a5", fontWeight: "800" }}>Delete</Text>
      </Pressable>
    </View>
  );
}
