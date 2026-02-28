// app/debug-input.tsx
import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Platform } from "react-native";

export default function DebugInputScreen() {
  const [email, setEmail] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Debug Email Input</Text>
      <Text style={styles.subtitle}>
        This screen is just a raw TextInput. If you can type here,
        the bug is in the sign-in layout. If you can't, it's global.
      </Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="type anything here…"
        placeholderTextColor="#6b7280"
        style={styles.input}
        autoCapitalize="none"
        keyboardType={Platform.OS === "web" ? "default" : "email-address"}
        autoCorrect={false}
      />

      <Text style={styles.echo}>Echo: {email || "…"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "#e5f4ff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "white",
    fontSize: 16,
  },
  echo: {
    color: "#9ca3af",
    marginTop: 16,
    fontSize: 14,
  },
});
