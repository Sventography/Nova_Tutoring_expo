import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useUser } from "../context/UserContext";
import { showToast } from "../utils/toast";
import { useTheme } from "../context/ThemeContext";

export default function AccountScreen() {
  const { user, ready, setUsername, setAvatar, updateProfile, signIn, signOut } =
    useUser();
  const { tokens } = useTheme();

  const [name, setName] = useState("");
  const [avatar, setAvatarLocal] = useState<string | null>(null);

  useEffect(() => {
    if (ready) {
      setName(user?.username || "");
      setAvatarLocal(user?.avatarUri ?? null);
    }
  }, [ready, user?.username, user?.avatarUri]);

  async function onPickAvatar() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Permission required", "Media access needed");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
      });
      if (res.canceled) return;
      const uri = res.assets?.[0]?.uri || null;
      if (uri) {
        setAvatarLocal(uri);
        await setAvatar(uri);
        showToast("Avatar updated");
      }
    } catch (e) {
      Alert.alert("Error", String(e));
    }
  }

  async function onSave() {
    const newName = name.trim() || "Student";
    await updateProfile({ username: newName, avatarUri: avatar });
    showToast("Profile saved");
  }

  async function onQuickLogin() {
    const newName = name.trim() || "Student";
    await signIn({ id: "local", username: newName, avatarUri: avatar });
    showToast("Signed in");
  }

  async function onSignOut() {
    await signOut();
    setName("");
    setAvatarLocal(null);
    showToast("Signed out");
  }

  return (
    <LinearGradient colors={tokens.gradient} style={{ flex: 1 }}>
      <View style={S.wrap}>
        <Text style={[S.h1, { color: tokens.accent }]}>Account</Text>

        <View style={S.row}>
          <Pressable onPress={onPickAvatar} style={[S.avatarWrap, { borderColor: tokens.border }]}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={S.avatar} />
            ) : (
              <View
                style={[
                  S.avatar,
                  S.avatarPlaceholder,
                  { backgroundColor: tokens.card },
                ]}
              >
                <Text
                  style={[
                    S.avatarInitial,
                    { color: tokens.text },
                  ]}
                >
                  {(name || "S").slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={[S.label, { color: tokens.cardText }]}>Username</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={
                tokens.isDark ? "#678a94" : "#6b7685"
              }
              style={[
                S.input,
                {
                  borderColor: tokens.border,
                  backgroundColor: tokens.card,
                  color: tokens.text,
                },
              ]}
            />
          </View>
        </View>

        <View style={S.rowBtns}>
          <Pressable
            style={[
              S.btn,
              {
                borderColor: tokens.accent,
                backgroundColor: tokens.isDark
                  ? "rgba(0,255,200,0.18)"
                  : "rgba(0,160,220,0.12)",
              },
            ]}
            onPress={onSave}
          >
            <Text style={[S.btnt, { color: tokens.text }]}>Save</Text>
          </Pressable>

          <Pressable
            style={[
              S.btn,
              {
                borderColor: tokens.border,
                backgroundColor: tokens.isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.04)",
              },
            ]}
            onPress={onQuickLogin}
          >
            <Text style={[S.btnt, { color: tokens.text }]}>Sign In</Text>
          </Pressable>

          <Pressable
            style={[
              S.btn,
              {
                borderColor: "#ff6b6b",
                backgroundColor: tokens.isDark
                  ? "rgba(255,107,107,0.18)"
                  : "rgba(255,107,107,0.12)",
              },
            ]}
            onPress={onSignOut}
          >
            <Text style={[S.btnt, { color: tokens.text }]}>Sign Out</Text>
          </Pressable>
        </View>

        <View
          style={[
            S.card,
            {
              borderColor: tokens.border,
              backgroundColor: tokens.card,
            },
          ]}
        >
          <Text style={[S.k, { color: tokens.cardText }]}>Current</Text>
          <Text style={[S.v, { color: tokens.text }]}>
            Name: {user?.username || "—"}
          </Text>
          <Text style={[S.v, { color: tokens.text }]}>
            Email: {user?.email || "—"}
          </Text>
          <Text style={[S.v, { color: tokens.text }]}>
            Avatar: {user?.avatarUri ? "Set" : "None"}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

export const S = StyleSheet.create({
  wrap: { padding: 16, gap: 12, flex: 1 },
  h1: { fontWeight: "800", fontSize: 22 },
  row: { flexDirection: "row", gap: 12, alignItems: "center" },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: "hidden",
    borderWidth: 2,
  },
  avatar: { width: 96, height: 96 },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontWeight: "800", fontSize: 32 },
  label: { marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 160,
  },
  rowBtns: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
  },
  btnt: { fontWeight: "800" },
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 8,
  },
  k: { marginBottom: 6 },
  v: { fontWeight: "600", marginTop: 2 },
});
