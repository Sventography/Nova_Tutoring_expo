import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
export default function Register() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!email || !password)
      return Alert.alert("Register", "Enter email and password");
    setBusy(true);
    try {
      await signUp(email, password, name);
      router.replace("/(tabs)/account");
    } finally {
      setBusy(false);
    }
  };
  return (
    <View
      variant="bg"
      style={{ flex: 1, backgroundColor: "#0b0b10", padding: 16, gap: 12 }}
    >
      <Text
        tone="text"
        style={{ color: "white", fontSize: 24, fontWeight: "800" }}
      >
        Create Account
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Name"
        placeholderTextColor="#7d7d92"
        style={{
          backgroundColor: "#151522",
          borderWidth: 1,
          borderColor: "#2a2a3a",
          borderRadius: 12,
          color: "white",
          padding: 12,
        }}
      />
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor="#7d7d92"
        autoCapitalize="none"
        keyboardType="email-address"
        style={{
          backgroundColor: "#151522",
          borderWidth: 1,
          borderColor: "#2a2a3a",
          borderRadius: 12,
          color: "white",
          padding: 12,
        }}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#7d7d92"
        secureTextEntry
        style={{
          backgroundColor: "#151522",
          borderWidth: 1,
          borderColor: "#2a2a3a",
          borderRadius: 12,
          color: "white",
          padding: 12,
        }}
      />
      <Pressable
        onPress={submit}
        disabled={busy}
        style={{
          backgroundColor: busy ? "#2a2a3a" : "#8b74ff",
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>
          {busy ? "…" : "Create Account"}
        </Text>
      </Pressable>
    </View>
  );
}
