import React, { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "../context/UserContext";

export default function AccountLogin() {
  const router = useRouter();
  const { loginWithEmailPassword } = useUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Log In", "Please enter your email and password.");
      return;
    }

    setBusy(true);

    try {
      await loginWithEmailPassword(email, password);
      router.replace("/(tabs)/account");
    } catch (e: any) {
      Alert.alert("Log In Failed", e?.message || "Could not log in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.c}>
      <Text style={s.h}>Log In</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor="#7d7d92"
        style={s.in}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
      />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#7d7d92"
        style={s.in}
        secureTextEntry
        textContentType="password"
      />

      <Pressable
        onPress={submit}
        disabled={busy}
        style={[s.btn, { opacity: busy ? 0.6 : 1 }]}
      >
        <Text style={s.bt}>{busy ? "Signing in…" : "Sign In"}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  c: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    gap: 12,
    backgroundColor: "#0b0b10",
  },
  h: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  in: {
    backgroundColor: "#151522",
    borderWidth: 1,
    borderColor: "#2a2a3a",
    borderRadius: 12,
    color: "white",
    padding: 12,
  },
  btn: {
    backgroundColor: "#6d57ff",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  bt: {
    color: "white",
    fontWeight: "700",
  },
});