import React from "react";
import { ScrollView, Text, View } from "react-native";

// Unlisted QR destination. No collector data is trusted until the API verifies it.
export default function CollectorLanding() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#120d22" }} contentContainerStyle={{ padding: 30, alignItems: "center" }}>
      <Text style={{ color: "#f8e8bb", fontSize: 28 }}>Nora's Last Lantern</Text>
      <View style={{ marginTop: 30 }}>
        <Text style={{ color: "#e3d9ed" }}>Collector verification is not enabled yet.</Text>
      </View>
    </ScrollView>
  );
}
