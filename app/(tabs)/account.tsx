// app/(tabs)/account.tsx
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
  Modal,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";

import { useUser } from "../context/UserContext";
import { useTheme } from "../context/ThemeContext";
import { useCoins } from "../context/CoinsContext";
import { useStreak } from "../context/StreakContext";
import { showToast } from "../utils/toast";
import { supabase } from "../lib/supabase";

export default function AccountScreen() {
  const {
    user,
    ready,
    setUsername,
    setAvatar,
    updateProfile,
    signOut,
    deleteAccount,
  } = useUser() as any;

  const { tokens } = useTheme();
  const { setCoins } = useCoins();
  const { resetStreak } = useStreak();
  const router = useRouter();

  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [avatarLocal, setAvatarLocal] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // crude "logged in" flag based on having any user identity
  const isLoggedIn = !!(
    user &&
    (user.id || user.username || user.contactEmail || user.email)
  );

  const currentAvatar = useMemo(() => {
    return (
      user?.avatarUri ??
      user?.avatarUrl ??
      user?.avatar ??
      user?.photoURL ??
      user?.imageUrl ??
      null
    );
  }, [
    user?.avatarUri,
    user?.avatarUrl,
    user?.avatar,
    user?.photoURL,
    user?.imageUrl,
  ]);

  useEffect(() => {
    if (!ready) return;

    if (!isLoggedIn) {
      setName("");
      setContactEmail("");
      setAvatarLocal(null);
      return;
    }

    setName(user?.username || user?.name || "");
    setContactEmail(user?.contactEmail || user?.email || "");
    setAvatarLocal(currentAvatar);
  }, [
    ready,
    isLoggedIn,
    user?.username,
    user?.name,
    user?.contactEmail,
    user?.email,
    currentAvatar,
  ]);

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

  async function onPickAvatar() {
    if (!isLoggedIn) {
      showToast("Sign in to change your avatar");
      return;
    }

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
      Alert.alert(
        "Avatar error",
        e?.message ? String(e.message) : String(e)
      );
    }
  }

  async function onSave() {
    if (!isLoggedIn) {
      showToast("Sign in to save your profile");
      return;
    }

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

  async function onSignOut() {
    await signOut?.();

    // 🔥 also clear coins + streak locally so HeaderBar updates instantly
    setCoins?.(0);
    await resetStreak?.();

    setName("");
    setContactEmail("");
    setAvatarLocal(null);
    showToast("Signed out");

    // go straight to full sign-in / sign-up screen
    try {
      router.replace("/sign-in");
    } catch {
      // ignore navigation errors
    }
  }

  function onDeleteAccountPress() {
    setShowDeleteModal(true);
  }

  async function handleConfirmDelete() {
    try {
      await deleteAccount?.();

      // after delete, fully clear coins + streak on this device
      setCoins?.(0);
      await resetStreak?.();

      setName("");
      setContactEmail("");
      setAvatarLocal(null);
      setShowDeleteModal(false);
      showToast("Account deleted");

      try {
        router.replace("/");
      } catch {
        // ignore navigation errors
      }
    } catch (e: any) {
      setShowDeleteModal(false);
      Alert.alert(
        "Error",
        e?.message ? String(e.message) : "Could not delete account"
      );
    }
  }

  const loginEmail = user?.email || user?.contactEmail || contactEmail || "";
  const loginUsername = user?.username || user?.name || name || "";

  async function onForgotPassword() {
    const email = loginEmail.trim();

    if (!email) {
      Alert.alert(
        "No email on file",
        "To reset your password, first sign up or sign in with an email address."
      );
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo:
          "https://novatutoring-eoq65leh2-contactnovatutoring-8350s-projects.vercel.app",
      });

      if (error) throw error;

      Alert.alert(
        "Check your email",
        `We sent a password reset link to:\n\n${email}`
      );
    } catch (e: any) {
      Alert.alert(
        "Reset error",
        e?.message ? String(e.message) : "Could not send reset email"
      );
    }
  }

  return (
    <LinearGradient colors={tokens.gradient} style={{ flex: 1 }}>
      <View style={S.wrap}>
        {/* Header */}
        <Text style={[S.h1, { color: tokens.accent }]}>
          Account Settings
        </Text>

        {/* Avatar + fields */}
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
            <Text style={[S.label, { color: tokens.cardText }]}>
              Username
            </Text>
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

            <Text
              style={[
                S.label,
                { color: tokens.cardText, marginTop: 10 },
              ]}
            >
              Contact Email (optional)
            </Text>
            <TextInput
              value={contactEmail}
              onChangeText={setContactEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType={
                Platform.OS === "web" ? "default" : "email-address"
              }
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

        {/* Top buttons */}
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
                borderColor: "#ff6b6b",
                backgroundColor: tokens.isDark
                  ? "rgba(255,107,107,0.18)"
                  : "rgba(255,107,107,0.12)",
              },
            ]}
            onPress={
              isLoggedIn
                ? onSignOut
                : () => {
                    try {
                      router.push("/sign-in");
                    } catch {}
                  }
            }
          >
            <Text style={[S.btnt, { color: tokens.text }]}>
              {isLoggedIn ? "Sign Out" : "Sign In"}
            </Text>
          </Pressable>
        </View>

        {/* 🔴 DELETE ACCOUNT – slimmer, like the other buttons */}
        <View style={{ marginTop: 24 }}>
          <Pressable
            style={[
              S.deleteBtn,
              {
                borderColor: "#ff2b2b",
                backgroundColor: tokens.isDark
                  ? "rgba(255,43,43,0.28)"
                  : "rgba(255,43,43,0.18)",
              },
            ]}
            onPress={onDeleteAccountPress}
          >
            <Text style={S.deleteText}>Delete Account</Text>
          </Pressable>
          <Text
            style={{
              marginTop: 6,
              fontSize: 11,
              color: tokens.cardText,
            }}
          >
            This will remove your profile and all saved local data on this
            device.
          </Text>
        </View>

        {/* Current info card */}
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
            Username: {loginUsername || "—"}
          </Text>
          <Text style={[S.v, { color: tokens.text }]}>
            Login Email: {loginEmail || "—"}
          </Text>
          <Text style={[S.v, { color: tokens.text }]}>
            Contact Email: {user?.contactEmail || "—"}
          </Text>
          <Text style={[S.v, { color: tokens.text }]}>
            Avatar: {currentAvatar ? "Set" : "None"}
          </Text>
        </View>

        {/* Security / “forgot” helpers */}
        <View
          style={[
            S.card,
            {
              borderColor: tokens.border,
              backgroundColor: tokens.card,
            },
          ]}
        >
          <Text style={[S.k, { color: tokens.cardText }]}>Security</Text>

          <Text style={[S.smallNote, { color: tokens.cardText }]}>
            This is the email you should use on the login screen:
          </Text>
          <Text style={[S.v, { color: tokens.text }]}>
            {loginEmail || "No login email saved yet"}
          </Text>

          {/* Forgot password – text link */}
          <Pressable
            style={{ marginTop: 8 }}
            onPress={onForgotPassword}
          >
            <Text style={S.privacyLink}>
              Forgot password? Send reset email
            </Text>
          </Pressable>

          {/* Forgot email */}
          <Pressable
            style={{ marginTop: 4 }}
            onPress={() => {
              if (!loginEmail) {
                Alert.alert(
                  "No email saved",
                  "Once you sign up or sign in with an email, it will be shown here so you can remember it later."
                );
              } else {
                Alert.alert("Login email", loginEmail);
              }
            }}
          >
            <Text style={S.privacyLink}>
              Forgot which email you used?
            </Text>
          </Pressable>

          {/* Forgot username */}
          <Pressable
            style={{ marginTop: 4 }}
            onPress={() => {
              if (!loginUsername) {
                Alert.alert(
                  "No username saved",
                  "Once you choose a username, it will be shown here so you can remember it later."
                );
              } else {
                Alert.alert("Your username", loginUsername);
              }
            }}
          >
            <Text style={S.privacyLink}>Forgot your username?</Text>
          </Pressable>
        </View>

        {/* Privacy Policy link */}
        <View style={S.privacyRow}>
          <Pressable onPress={() => setShowPrivacyModal(true)}>
            <Text style={S.privacyLink}>Privacy Policy</Text>
          </Pressable>
        </View>
      </View>

      {/* Delete Account confirmation modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={S.modalBackdrop}>
          <View
            style={[
              S.modalCard,
              {
                backgroundColor: tokens.card,
                borderColor: "#ff2b2b",
              },
            ]}
          >
            <Text style={[S.modalTitle, { color: tokens.text }]}>
              Delete account?
            </Text>
            <Text style={[S.modalBody, { color: tokens.cardText }]}>
              Are you sure? This will delete your name, avatar, coins,
              achievements, purchases, and all other saved data on this
              device. This cannot be undone.
            </Text>

            <View style={S.modalRowBtns}>
              <Pressable
                style={[
                  S.modalBtn,
                  {
                    borderColor: tokens.border,
                    backgroundColor: tokens.isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                  },
                ]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={[S.btnt, { color: tokens.text }]}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={[
                  S.modalBtn,
                  {
                    borderColor: "#ff2b2b",
                    backgroundColor: tokens.isDark
                      ? "rgba(255,43,43,0.25)"
                      : "rgba(255,43,43,0.18)",
                  },
                ]}
                onPress={handleConfirmDelete}
              >
                <Text style={[S.btnt, { color: tokens.text }]}>
                  Delete
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Privacy Policy modal */}
      <Modal
        visible={showPrivacyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={S.modalBackdrop}>
          <View
            style={[
              S.modalCard,
              {
                backgroundColor: tokens.card,
                borderColor: tokens.border,
              },
            ]}
          >
            <Text style={[S.modalTitle, { color: tokens.text }]}>
              Privacy Policy
            </Text>

            <ScrollView
              style={{ maxHeight: 360, marginTop: 8 }}
              showsVerticalScrollIndicator
            >
              <Text style={[S.modalBody, { color: tokens.cardText }]}>
                Nova Tutoring stores your profile (name, optional contact
                email, avatar), your coins, achievements, quiz history, and
                shop purchases locally on this device so the app can show
                your progress and unlocked items.{"\n\n"}
                The app does not create an online account for you and does
                not sell your data or show third-party ads.{"\n\n"}
                When you make real-money purchases, payments are processed
                by third-party providers such as Stripe. Your full card
                details are handled by them and are not stored in this app.{"\n\n"}
                For physical orders, we may collect your name, email
                address, and shipping address so we can process and ship
                your order and send order confirmations. Some order details
                may be stored securely on our server or in logs for support
                and record-keeping.{"\n\n"}
                You can erase your local profile, coins, achievements, and
                purchase history at any time using the “Delete Account”
                option on this screen, which removes your saved data on
                this device and returns you to the start of the app.{"\n\n"}
                For more details or questions, please refer to the privacy
                information in the App Store listing or contact us using
                the email address listed there.
              </Text>
            </ScrollView>

            <View style={[S.modalRowBtns, { marginTop: 14 }]}>
              <Pressable
                style={[
                  S.modalBtn,
                  {
                    borderColor: tokens.border,
                    backgroundColor: tokens.isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                  },
                ]}
                onPress={() => setShowPrivacyModal(false)}
              >
                <Text style={[S.btnt, { color: tokens.text }]}>
                  Close
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: "center",
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

  smallNote: {
    fontSize: 11,
    marginTop: 4,
  },

  deleteBtn: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  deleteText: {
    fontWeight: "900",
    fontSize: 16,
    color: "#000000",
  },

  privacyRow: {
    marginTop: 18,
    alignItems: "center",
  },
  privacyLink: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9ad8ff",
    textDecorationLine: "underline",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  modalBody: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "left",
  },
  modalRowBtns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
  },
});
