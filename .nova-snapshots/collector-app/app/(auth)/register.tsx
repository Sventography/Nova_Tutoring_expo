// app/(auth)/register.tsx

import React, { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useUser } from "../context/UserContext";

export default function Register() {
  const { signUpWithEmailPassword } = useUser();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password.trim()) {
      Alert.alert("Register", "Please enter your email and password.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Register", "Password must be at least 6 characters.");
      return;
    }

    setBusy(true);

    try {
      const result = await signUpWithEmailPassword(
        name,
        trimmedEmail,
        password
      );

      if (result.needsEmailConfirmation) {
        Alert.alert(
          "Check your email",
          `We sent a confirmation link to ${result.email}.\n\nOpen that email on this iPhone and tap Confirm Email. Nova Tutoring should open automatically and finish signing you in.`
        );
        return;
      }

      Alert.alert("Account created", "Your Nova Tutoring account is ready.");
    } catch (e: any) {
      Alert.alert(
        "Registration Failed",
        e?.message || "Could not create account."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.c}>
      <Text style={s.h}>Create Account</Text>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Name"
        placeholderTextColor="#7d7d92"
        style={s.in}
        autoCapitalize="words"
        editable={!busy}
      />

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
        editable={!busy}
      />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#7d7d92"
        style={s.in}
        secureTextEntry
        textContentType="newPassword"
        editable={!busy}
        onSubmitEditing={() => {
          if (!busy) void submit();
        }}
      />

      <Pressable
        onPress={() => void submit()}
        disabled={busy}
        style={[s.btn, { backgroundColor: busy ? "#2a2a3a" : "#8b74ff" }]}
      >
        <Text style={s.bt}>{busy ? "Creating…" : "Create Account"}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  c: {
    flex: 1,
    backgroundColor: "#0b0b10",
    padding: 16,
    gap: 12,
    justifyContent: "center",
  },
  h: {
    color: "white",
    fontSize: 24,
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
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  bt: {
    color: "white",
    fontWeight: "700",
  },
});
