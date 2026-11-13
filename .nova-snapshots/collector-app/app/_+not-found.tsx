import React from "react";
import { View, Text } from "react-native";
import { Link } from "expo-router";
export default function NotFound() {
  return (
    <View
      variant="bg"
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        backgroundColor: "#fff",
      }}
    >
      <Text tone="text" style={{ fontSize: 22, color: "#000" }}>
        Route not found
      </Text>
      <Link href="/" style={{ color: "blue" }}>
        Go Home
      </Link>
    </View>
  );
}
