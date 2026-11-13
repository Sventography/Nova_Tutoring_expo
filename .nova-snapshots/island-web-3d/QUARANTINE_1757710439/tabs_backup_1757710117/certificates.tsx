import React from "react";
import { View, Text, FlatList, Pressable } from "react-native"; 
import { useCertificates } from "../context/CertificatesContext";
import CertificateRow from "@/components/CertificateRow";
import CertificateModal from "../modals/CertificateModal";

export default function CertificatesTab() {
  const { records, clear, refresh } = useCertificates();
  return (
    <View style={{ flex: 1, backgroundColor: "#0b0f14" }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderColor: "#111827",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: "white", fontSize: 18, fontWeight: "800" }}>
          Certificates
        </Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={refresh}
            style={{
              backgroundColor: "#111827",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "#374151",
            }}
          >
            <Text style={{ color: "white", fontWeight: "800" }}>Refresh</Text>
          </Pressable>
          <Pressable
            onPress={clear}
            style={{
              backgroundColor: "#111827",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "#374151",
            }}
          >
            <Text style={{ color: "#fca5a5", fontWeight: "800" }}>
              Clear All
            </Text>
          </Pressable>
        </View>
      </View>
      <FlatList
        data={records}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => <View />}
        ListEmptyComponent={
          <View style={{ padding: 24 }}>
            <Text style={{ color: "#9ca3af" }}>No certificates yet.</Text>
          </View>
        }
      />
      <CertificateModal />
    </View>
  );
}
