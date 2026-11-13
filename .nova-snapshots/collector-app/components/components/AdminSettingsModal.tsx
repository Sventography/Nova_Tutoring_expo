import React, { useEffect, useState } from "react";
import { mergeMissing } from "../lib/seed";
import { showToast } from "../lib/toast";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  Platform,
  Switch,
} from "react-native";
import { useThemeColors } from "../providers/ThemeBridge";
import {
  getPasscode,
  setPasscode,
  getOwnerEmail,
  setOwnerEmail,
  getLowStockThreshold,
  setLowStockThreshold,
  getSoundsEnabled,
  setSoundsEnabled,
  getHapticsEnabled,
  setHapticsEnabled,
  setAdminEnabled,
} from "../lib/admin";

type Props = { visible: boolean; onClose: () => void };

export default function AdminSettingsModal({ visible, onClose }: Props) {
  const palette = useThemeColors();
  const [pass, setPass] = useState("");
  const [email, setEmail] = useState("");
  const [low, setLow] = useState("5");
  const [sounds, setSounds] = useState(true);
  const [haptics, setHaptics] = useState(true);

  useEffect(() => {
    let live = true;
    if (!visible) return;
    (async () => {
      const [p, e, l, snd, hap] = await Promise.all([
        getPasscode(),
        getOwnerEmail(),
        getLowStockThreshold(),
        getSoundsEnabled(),
        getHapticsEnabled(),
      ]);
      if (!live) return;
      setPass(p || "");
      setEmail(e || "");
      setLow(String(l ?? 5));
      setSounds(!!snd);
      setHaptics(!!hap);
    })();
    return () => {
      live = false;
    };
  }, [visible]);

  async function save() {
    await setPasscode(pass || "nova");
    await setOwnerEmail(email);
    const n = Math.max(0, parseInt(low || "5", 10) || 5);
    await setLowStockThreshold(n);
    await setSoundsEnabled(sounds);
    await setHapticsEnabled(haptics);
    onClose();
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
            maxWidth: 520,
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
              Admin Settings
            </Text>
            <Text style={{ color: palette.subtext, marginTop: 4 }}>
              Passcode, email, low-stock, sounds & haptics
            </Text>
          </View>
          <View style={{ padding: 16, gap: 12 }}>
            <View>
              <Text style={{ color: palette.subtext, marginBottom: 6 }}>
                Passcode
              </Text>
              <TextInput
                value={pass}
                onChangeText={setPass}
                secureTextEntry
                placeholder="new passcode"
                placeholderTextColor="#6b7280"
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
            </View>
            <View>
              <Text style={{ color: palette.subtext, marginBottom: 6 }}>
                Owner Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor="#6b7280"
                autoCapitalize="none"
                style={{
                  borderWidth: 1,
                  borderColor: palette.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: palette.text,
                  backgroundColor: "#0b1220",
                }}
              />
            </View>
            <View>
              <Text style={{ color: palette.subtext, marginBottom: 6 }}>
                Low-Stock Threshold
              </Text>
              <TextInput
                value={low}
                onChangeText={(t) => setLow(t.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                placeholder="5"
                placeholderTextColor="#6b7280"
                style={{
                  borderWidth: 1,
                  borderColor: palette.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: palette.text,
                  backgroundColor: "#0b1220",
                }}
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ color: palette.subtext, fontWeight: "800" }}>
                Enable Sounds
              </Text>
              <Switch
                value={sounds}
                onValueChange={setSounds}
                thumbColor={sounds ? "#22c55e" : "#374151"}
                trackColor={{ true: "#16a34a", false: "#111827" }}
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ color: palette.subtext, fontWeight: "800" }}>
                Enable Haptics
              </Text>
              <Switch
                value={haptics}
                onValueChange={setHaptics}
                thumbColor={haptics ? "#22c55e" : "#374151"}
                trackColor={{ true: "#16a34a", false: "#111827" }}
              />
            </View>
            <View style={{ gap: 8, marginTop: 6 }}>
              <Text style={{ color: palette.subtext, fontWeight: "800" }}>
                Test notifications
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={() => showToast("Success test ✓", "success")}
                  style={({ pressed }) => ({
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: "#22c55e",
                    backgroundColor: pressed ? "#0b1a11" : "#07140e",
                  })}
                >
                  <Text style={{ color: "#22c55e", fontWeight: "900" }}>
                    Test Success
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => showToast("Error test ✗", "error")}
                  style={({ pressed }) => ({
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: "#ef4444",
                    backgroundColor: pressed ? "#2a0b0b" : "#160909",
                  })}
                >
                  <Text style={{ color: "#ef4444", fontWeight: "900" }}>
                    Test Error
                  </Text>
                </Pressable>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 4,
              }}
            >
              <Pressable
                onPress={async () => {
                  await mergeMissing();
                }}
                style={({ pressed }) => ({
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#22d3ee",
                  backgroundColor: pressed ? "#05202a" : "#06121a",
                })}
              >
                <Text style={{ color: "#22d3ee", fontWeight: "900" }}>
                  Merge Missing Stock
                </Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  await setAdminEnabled(false);
                  onClose();
                }}
                style={({ pressed }) => ({
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#ef4444",
                  backgroundColor: pressed ? "#2a0b0b" : "#160909",
                })}
              >
                <Text style={{ color: "#ef4444", fontWeight: "900" }}>
                  Lock Admin
                </Text>
              </Pressable>
              <View style={{ flexDirection: "row", gap: 10 }}>
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
                  onPress={save}
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
                    Save
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
