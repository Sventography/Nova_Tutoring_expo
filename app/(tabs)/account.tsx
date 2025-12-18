import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useUser } from "../context/UserContext";
import { showToast } from "../utils/toast";
import { useTheme } from "../context/ThemeContext";

export default function AccountScreen() {
  const {
    user,
    ready,
    setUsername,
    setAvatar,
    updateProfile,
    signIn,
    signOut,
  } = useUser() as any;

  const { tokens } = useTheme();

  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [avatarLocal, setAvatarLocal] = useState<string | null>(null);

  const currentAvatar = useMemo(() => {
    return (
      user?.avatarUri ??
      user?.avatarUrl ??
      user?.avatar ??
      user?.photoURL ??
      user?.imageUrl ??
      null
    );
  }, [user?.avatarUri, user?.avatarUrl, user?.avatar, user?.photoURL, user?.imageUrl]);

  useEffect(() => {
    if (ready) {
      setName(user?.username || user?.name || "");
      setContactEmail(user?.contactEmail || "");
      setAvatarLocal(currentAvatar);
    }
  }, [ready, user?.username, user?.name, user?.contactEmail, currentAvatar]);

  const saveAvatarEverywhere = async (uri: string | null) => {
    await updateProfile?.({
      avatarUri: uri,
      avatarUrl: uri,
      avatar: uri,
      photoURL: uri,
      imageUrl: uri,
    });
    await setAvatar?.(uri ?? null);
  };

  const pickAvatarWeb = async () => {
    return new Promise<string | null>((resolve) => {
      try {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) return resolve(null);

          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        };
        input.click();
      } catch {
        resolve(null);
      }
    });
  };

  async function onPickAvatar() {
    try {
      let uri: string | null = null;

      if (Platform.OS === "web") {
        uri = await pickAvatarWeb();
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permission required", "Media access needed");
          return;
        }

        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.9,
        });

        if (res.canceled) return;
        uri = res.assets?.[0]?.uri || null;
      }

      if (!uri) return;

      setAvatarLocal(uri);
      await saveAvatarEverywhere(uri);
      showToast("Avatar updated");
    } catch (e: any) {
      console.log("onPickAvatar error:", e);
      Alert.alert("Avatar error", e?.message ? String(e.message) : String(e));
    }
  }

  async function onSave() {
    const newName = name.trim() || "Student";
    const newEmail = contactEmail.trim();

    await updateProfile?.({
      username: newName,
      name: newName,
      displayName: newName,
      contactEmail: newEmail,
      avatarUri: avatarLocal,
      avatarUrl: avatarLocal,
      avatar: avatarLocal,
      photoURL: avatarLocal,
      imageUrl: avatarLocal,
    });

    await setUsername?.(newName);
    await saveAvatarEverywhere(avatarLocal);

    showToast("Profile saved");
  }

  async function onQuickLogin() {
    const newName = name.trim() || "Student";
    const newEmail = contactEmail.trim();

    await signIn?.({
      id: "local",
      username: newName,
      name: newName,
      contactEmail: newEmail,
      avatarUri: avatarLocal,
      avatarUrl: avatarLocal,
      avatar: avatarLocal,
      photoURL: avatarLocal,
      imageUrl: avatarLocal,
    });

    showToast("Signed in");
  }

  async function onSignOut() {
    await signOut?.();
    setName("");
    setContactEmail("");
    setAvatarLocal(null);
    showToast("Signed out");
  }

  return (
    <LinearGradient colors={tokens.gradient} style={{ flex: 1 }}>
      <View style={S.wrap}>
        <Text style={[S.h1, { color: tokens.accent }]}>Account</Text>

        <View style={S.row}>
          <Pressable
            onPress={onPickAvatar}
            style={[S.avatarWrap, { borderColor: tokens.border }]}
          >
            {avatarLocal ? (
              <Image source={{ uri: avatarLocal }} style={S.avatar} />
            ) : (
              <View
                style={[
                  S.avatar,
                  S.avatarPlaceholder,
                  { backgroundColor: tokens.card },
                ]}
              >
                <Text style={[S.avatarInitial, { color: tokens.text }]}>
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
              placeholderTextColor={tokens.isDark ? "#678a94" : "#6b7685"}
              style={[
                S.input,
                {
                  borderColor: tokens.border,
                  backgroundColor: tokens.card,
                  color: tokens.text,
                },
              ]}
            />

            <Text style={[S.label, { color: tokens.cardText, marginTop: 10 }]}>
              Contact Email (optional)
            </Text>
            <TextInput
              value={contactEmail}
              onChangeText={setContactEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType={Platform.OS === "web" ? "default" : "email-address"}
              placeholderTextColor={tokens.isDark ? "#678a94" : "#6b7685"}
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
            Name: {user?.username || user?.name || "—"}
          </Text>
          <Text style={[S.v, { color: tokens.text }]}>
            Contact Email: {user?.contactEmail || "—"}
          </Text><Text style={[S.v, { color: tokens.text }]}>
            Avatar: {currentAvatar ? "Set" : "None"}
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
