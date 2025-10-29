import React, { useState } from "react";
import {
  View,
  Text,
  Switch,
  Pressable,
  Alert,
  Platform,
  TextInput,
} from "react-native";
import { useSettings } from "../state/SettingsContext";
import { useToast } from "../state/ToastContext";

export default function SettingsScreen() {
  const {
    prefs,
    setPrefs,
    resetProgress,
    resetCollection,
    resetAchievements,
    resetCoins,
    resetAll,
  } = useSettings();
  const [name, setName] = useState(prefs.username || "");
  const toast = useToast().show;
  const confirm = (title: string, onOk: () => void) => {
    Alert.alert(title, "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", style: "destructive", onPress: onOk },
    ]);
  };
  const saveName = () => {
    setPrefs({ username: name.trim() });
    toast("Name saved");
  };
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 12 }}>
        Settings
      </Text>
      <View
        style={{
          padding: 16,
          backgroundColor: "white",
          borderRadius: 16,
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>
          Display Name
        </Text>
        <View style={{ flexDirection: "row" }}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="#9CA3AF"
            style={{
              flex: 1,
              backgroundColor: "#F3F4F6",
              borderRadius: 12,
              padding: 12,
              marginRight: 8,
            }}
          />
          <Pressable
            onPress={saveName}
            style={{
              backgroundColor: "#111827",
              paddingHorizontal: 14,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "800" }}>Save</Text>
          </Pressable>
        </View>
      </View>
      <View
        style={{
          padding: 16,
          backgroundColor: "white",
          borderRadius: 16,
          marginBottom: 12,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600" }}>Sound</Text>
          <Switch
            value={prefs.sound}
            onValueChange={(v) => setPrefs({ sound: v })}
          />
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600" }}>Haptics</Text>
          <Switch
            value={prefs.haptics}
            onValueChange={(v) => setPrefs({ haptics: v })}
          />
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600" }}>Animations</Text>
          <Switch
            value={prefs.animations}
            onValueChange={(v) => setPrefs({ animations: v })}
          />
        </View>
      </View>
      <View
        style={{
          padding: 16,
          backgroundColor: "white",
          borderRadius: 16,
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 10 }}>
          Resets
        </Text>
        <Pressable
          onPress={() =>
            confirm("Reset studied progress", async () => {
              await resetProgress();
              toast("Studied progress cleared");
            })
          }
          style={{
            backgroundColor: "#E5E7EB",
            padding: 12,
            borderRadius: 12,
            marginBottom: 8,
          }}
        >
          <Text style={{ fontWeight: "700" }}>Reset Studied Progress</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            confirm("Reset collection", async () => {
              await resetCollection();
              toast("Collection cleared");
            })
          }
          style={{
            backgroundColor: "#E5E7EB",
            padding: 12,
            borderRadius: 12,
            marginBottom: 8,
          }}
        >
          <Text style={{ fontWeight: "700" }}>Reset Collection</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            confirm("Reset achievements", async () => {
              await resetAchievements();
              toast("Achievements reset");
            })
          }
          style={{
            backgroundColor: "#E5E7EB",
            padding: 12,
            borderRadius: 12,
            marginBottom: 8,
          }}
        >
          <Text style={{ fontWeight: "700" }}>Reset Achievements</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            confirm("Reset coins", async () => {
              await resetCoins();
              toast("Coins reset");
            })
          }
          style={{
            backgroundColor: "#E5E7EB",
            padding: 12,
            borderRadius: 12,
            marginBottom: 8,
          }}
        >
          <Text style={{ fontWeight: "700" }}>Reset Coins</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            confirm("Reset everything", async () => {
              await resetAll();
              toast("All data reset");
            })
          }
          style={{ backgroundColor: "#EF4444", padding: 12, borderRadius: 12 }}
        >
          <Text style={{ color: "white", fontWeight: "800" }}>Reset All</Text>
        </Pressable>
      </View>
      <View style={{ padding: 16, backgroundColor: "white", borderRadius: 16 }}>
        <Text style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>App</Text>
        <Text>Version 1.0.0</Text>
        <Text style={{ marginTop: 6 }}>Platform {Platform.OS}</Text>
      </View>
    </View>
  );
}
