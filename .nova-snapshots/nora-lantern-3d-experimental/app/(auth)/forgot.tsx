// app/(auth)/forgot.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import { useUser } from "../context/UserContext";

export default function ForgotPassword() {
  const { resetPassword } = useUser();

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendToken() {
    try {
      if (!email.trim()) {
        throw new Error("Enter your email");
      }

      setBusy(true);

      await resetPassword(email.trim());

      // Web fallback
      if (Platform.OS === "web") {
        Alert.alert(
          "Reset Email Sent",
          "If an account exists for this email, a password reset email has been sent."
        );

        return;
      }

      // Native mail composer confirmation
      const MailComposer = await import("expo-mail-composer");

      const available =
        await MailComposer.isAvailableAsync();

      if (available) {
        await MailComposer.composeAsync({
          recipients: [email.trim()],
          subject:
            "Nova Tutoring Password Reset",
          body:
            "A password reset was requested for your Nova Tutoring account.\n\nPlease check your inbox for the reset link.",
        });
      }

      Alert.alert(
        "Reset Email Sent",
        "If an account exists for this email, a password reset email has been sent."
      );
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.message ||
          "Could not send password reset email"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <LinearGradient
      colors={["#000000", "#0d1b2a"]}
      style={{ flex: 1 }}
    >
      <View style={S.wrap}>
        <Text style={S.title}>
          Forgot Password
        </Text>

        <TextInput
          style={S.input}
          placeholder="Enter your account email"
          placeholderTextColor="#8aa0ad"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TouchableOpacity
          style={[
            S.btn,
            {
              backgroundColor: "#00e5ff",
              opacity: busy ? 0.7 : 1,
            },
          ]}
          activeOpacity={0.86}
          onPress={sendToken}
          disabled={busy}
        >
          <Text style={S.btnTxt}>
            {busy
              ? "Sending..."
              : "Send Reset Email"}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

export const S = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#e6f7ff",
    marginBottom: 12,
    textAlign: "center",
  },

  input: {
    borderWidth: 2,
    borderColor: "#00e5ff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    color: "#e6f7ff",
    backgroundColor:
      "rgba(255,255,255,0.02)",
  },

  btn: {
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  btnTxt: {
    color: "#001018",
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});