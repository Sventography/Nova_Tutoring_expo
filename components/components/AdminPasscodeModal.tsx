import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  Platform,
} from "react-native";
import { useThemeColors } from "../providers/ThemeBridge";
import { verifyPasscode } from "../lib/admin";

type Props = { visible: boolean; onClose: () => void };

export default function AdminPasscodeModal({ visible, onClose }: Props) {
  const palette = useThemeColors();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    const ok = await verifyPasscode(code);
    if (ok) {
      setCode("");
      setError(null);
      onClose();
    } else setError("Wrong passcode");
  }
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 480,
            backgroundColor: palette.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: palette.border,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: Platform.OS === "ios" ? 14 : 10,
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: palette.border,
            }}
          >
            <Text
              style={{ color: palette.text, fontSize: 20, fontWeight: "900" }}
            >
              Unlock Admin
            </Text>
            <Text style={{ color: palette.subtext, marginTop: 4 }}>
              Enter passcode to reveal admin tabs
            </Text>
          </View>
          <View style={{ padding: 16 }}>
            <TextInput
              value={code}
              onChangeText={(t) => {
                setCode(t);
                setError(null);
              }}
              placeholder="Passcode"
              placeholderTextColor="#6b7280"
              secureTextEntry
              autoCapitalize="none"
              style={{
                borderWidth: 1,
                borderColor: palette.accent,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: palette.text,
                backgroundColor: "#06121a",
              }}
            />
            {error ? (
              <Text
                style={{ color: "#ef4444", marginTop: 8, fontWeight: "800" }}
              >
                {error}
              </Text>
            ) : null}
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginTop: 12,
                justifyContent: "flex-end",
              }}
            >
              <Pressable
                onPress={onClose}
                style={({ pressed }) => ({
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: palette.border,
                  backgroundColor: pressed ? "#0a1621" : palette.card,
                })}
              >
                <Text style={{ color: palette.subtext, fontWeight: "800" }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={submit}
                style={({ pressed }) => ({
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: palette.accent,
                  backgroundColor: pressed ? "#07131d" : "#06121a",
                })}
              >
                <Text style={{ color: palette.accent, fontWeight: "900" }}>
                  Unlock
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
