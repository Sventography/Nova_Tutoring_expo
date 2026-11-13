// app/(tabs)/account.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";

import { useUser } from "../context/UserContext";
import { useTheme } from "../context/ThemeContext";
import { useStreak } from "../context/StreakContext";
import { showToast } from "../utils/toast";
import { DISCORD_INVITE_URL } from "../constants/community";

export default function AccountScreen() {
  const {
    user,
    ready,
    session,
    setAvatar,
    resetPassword,
    signOut,
    deleteAccount,
  } = useUser() as any;

  const { tokens } = useTheme();
  const { resetStreak } = useStreak();
  const router = useRouter();

  const [avatarLocal, setAvatarLocal] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const isLoggedIn = !!session?.user?.id;

  const currentAvatar = useMemo(
    () =>
      user?.avatarUri ??
      user?.avatarUrl ??
      user?.avatar ??
      user?.photoURL ??
      user?.imageUrl ??
      null,
    [
      user?.avatarUri,
      user?.avatarUrl,
      user?.avatar,
      user?.photoURL,
      user?.imageUrl,
    ]
  );

  const loginUsername =
    user?.username || user?.name || user?.displayName || "";

  const loginEmail =
    (session?.user?.email as string | undefined) || "";

  useEffect(() => {
    if (!ready) return;
    setAvatarLocal(currentAvatar);
  }, [ready, currentAvatar]);

  const pickAvatarWeb = async () =>
    new Promise<string | null>((resolve) => {
      try {
        const webGlobal = globalThis as any;
        const doc = webGlobal?.document;
        const FileReaderClass = webGlobal?.FileReader;

        if (!doc || !FileReaderClass) {
          resolve(null);
          return;
        }

        const input = doc.createElement("input");
        input.type = "file";
        input.accept = "image/jpeg,image/png,image/webp";

        input.onchange = () => {
          const file = input.files?.[0];

          if (!file) {
            resolve(null);
            return;
          }

          if (
            !["image/jpeg", "image/png", "image/webp"].includes(
              String(file.type || "").toLowerCase()
            )
          ) {
            Alert.alert(
              "Unsupported image",
              "Please choose a JPEG, PNG, or WebP image."
            );
            resolve(null);
            return;
          }

          if (Number(file.size || 0) > 5 * 1024 * 1024) {
            Alert.alert(
              "Image too large",
              "Please choose an avatar smaller than 5 MB."
            );
            resolve(null);
            return;
          }

          const reader = new FileReaderClass();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        };

        input.click();
      } catch {
        resolve(null);
      }
    });

  async function saveAvatarEverywhere(
    uri: string | null
  ): Promise<string | null> {
    const saved = await setAvatar?.(uri ?? null);

    return typeof saved === "string" || saved === null
      ? saved
      : uri;
  }

  async function onPickAvatar() {
    if (!isLoggedIn) {
      showToast("Sign in to change your avatar");
      return;
    }

    if (savingAvatar) return;

    const previousAvatar = avatarLocal;
    setSavingAvatar(true);

    try {
      let storedUri: string | null = null;

      if (Platform.OS === "web") {
        storedUri = await pickAvatarWeb();
      } else {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          Alert.alert(
            "Permission required",
            "Please allow Nova Tutoring to access your photos."
          );
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.45,
          base64: true,
        });

        if (result.canceled) return;

        const asset = result.assets?.[0];

        if (!asset) {
          throw new Error("No image was returned by the photo picker.");
        }

        if (!asset.base64) {
          throw new Error(
            "Nova could not prepare that photo for permanent upload. Please choose it again."
          );
        }

        storedUri = `data:image/jpeg;base64,${asset.base64}`;
      }

      if (!storedUri) return;

      // Show the crop immediately while the permanent upload finishes.
      setAvatarLocal(storedUri);

      const persistentUrl =
        await saveAvatarEverywhere(storedUri);

      setAvatarLocal(persistentUrl);
      showToast("Avatar saved to your account");
    } catch (error: any) {
      // Never leave a temporary preview behind after a failed upload.
      setAvatarLocal(previousAvatar);

      Alert.alert(
        "Avatar error",
        error?.message || "The selected photo could not be saved."
      );
    } finally {
      setSavingAvatar(false);
    }
  }

  async function onSignOut() {
    if (!isLoggedIn) {
      (router as any).push("/sign-in");
      return;
    }

    try {
      await Promise.resolve(
        signOut?.()
      );
    } catch (error) {
      console.warn(
        "[Account] signOut warning:",
        error
      );
    }

    // Do not navigate until auth and guest cleanup have completed. This keeps
    // account reward listeners from recreating the guest wallet mid-transition.
    setAvatarLocal(null);
    showToast("Signed out");
    (router as any).replace("/");
  }

  async function handleConfirmDelete() {
    if (!deletePassword) {
      Alert.alert(
        "Password required",
        "Enter your current password to permanently delete this account."
      );
      return;
    }

    setDeletingAccount(true);

    try {
      await deleteAccount?.(deletePassword);

      try {
        await Promise.resolve(resetStreak?.());
      } catch (error) {
        console.warn(
          "[Account] local streak reset after deletion warning:",
          error
        );
      }

      setAvatarLocal(null);
      setDeletePassword("");
      setShowDeleteModal(false);
      showToast("Account permanently deleted");
      (router as any).replace("/");
    } catch (error: any) {
      Alert.alert(
        "Could not delete account",
        error?.message ||
          "Nova could not permanently delete this account."
      );
    } finally {
      setDeletingAccount(false);
    }
  }

  async function onForgotPassword() {
    if (!loginEmail) {
      Alert.alert(
        "No login email",
        "Sign in first so Nova knows which account to reset."
      );
      return;
    }

    try {
      await resetPassword?.(loginEmail);

      Alert.alert(
        "Check your email",
        `We sent a clickable password-reset button to:

${loginEmail}`
      );
    } catch (error: any) {
      Alert.alert(
        "Reset error",
        error?.message || "Could not send the reset email."
      );
    }
  }

  async function onContactUs() {
    const email = "contact.novatutoring@gmail.com";
    const subject = encodeURIComponent("Nova Tutoring Support");
    const body = encodeURIComponent(
      "Hi Nova Tutoring team,\n\nI have a question about the app:\n\n"
    );

    try {
      await Linking.openURL(
        `mailto:${email}?subject=${subject}&body=${body}`
      );
    } catch {
      Alert.alert(
        "Email not available",
        "You can email contact.novatutoring@gmail.com."
      );
    }
  }

  async function onJoinDiscord() {
    if (!DISCORD_INVITE_URL) {
      Alert.alert(
        "Discord unavailable",
        "The Nova Tutoring Discord invitation has not been configured."
      );
      return;
    }

    try {
      const supported = await Linking.canOpenURL(DISCORD_INVITE_URL);

      if (!supported) {
        throw new Error("The Discord invitation could not be opened.");
      }

      await Linking.openURL(DISCORD_INVITE_URL);
    } catch {
      Alert.alert(
        "Unable to open Discord",
        `Open ${DISCORD_INVITE_URL} in your browser or Discord.`
      );
    }
  }

  function IdentityRow({
    label,
    value,
    action,
    onPress,
  }: {
    label: string;
    value: string;
    action: string;
    onPress: () => void;
  }) {
    return (
      <View style={S.identityRow}>
        <View style={S.identityText}>
          <Text style={[S.identityLabel, { color: tokens.cardText }]}>
            {label}
          </Text>
          <Text
            style={[S.identityValue, { color: tokens.text }]}
            numberOfLines={1}
          >
            {value || "—"}
          </Text>
        </View>

        <Pressable
          onPress={onPress}
          disabled={!isLoggedIn}
          style={[
            S.smallButton,
            {
              borderColor: tokens.accent,
              opacity: isLoggedIn ? 1 : 0.45,
            },
          ]}
        >
          <Text style={[S.smallButtonText, { color: tokens.text }]}>
            {action}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <LinearGradient colors={tokens.gradient} style={S.flex}>
      <ScrollView
        style={S.flex}
        contentContainerStyle={S.wrap}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[S.h1, { color: tokens.accent }]}>
          Account Settings
        </Text>

        <View
          style={[
            S.card,
            {
              borderColor: tokens.border,
              backgroundColor: tokens.card,
            },
          ]}
        >
          <Text style={[S.sectionTitle, { color: tokens.text }]}>
            Profile
          </Text>

          <View style={S.avatarSection}>
            <Pressable
              onPress={onPickAvatar}
              disabled={savingAvatar}
              style={[
                S.avatarWrap,
                {
                  borderColor: tokens.border,
                  opacity: savingAvatar ? 0.72 : 1,
                },
              ]}
            >
              {avatarLocal ? (
                <Image
                  source={{ uri: avatarLocal }}
                  style={S.avatar}
                />
              ) : (
                <View
                  style={[
                    S.avatar,
                    S.avatarPlaceholder,
                    {
                      backgroundColor: tokens.isDark
                        ? "#0b2030"
                        : "#e8f7fb",
                    },
                  ]}
                >
                  <Text
                    style={[S.avatarInitial, { color: tokens.text }]}
                  >
                    {(loginUsername || "S").slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}

              {savingAvatar ? (
                <View style={S.avatarSavingOverlay}>
                  <ActivityIndicator color="#ffffff" />
                </View>
              ) : null}
            </Pressable>

            <Pressable
              onPress={onPickAvatar}
              disabled={!isLoggedIn || savingAvatar}
              style={[
                S.photoButton,
                {
                  borderColor: tokens.accent,
                  opacity:
                    isLoggedIn && !savingAvatar ? 1 : 0.45,
                },
              ]}
            >
              <Text style={[S.photoButtonText, { color: tokens.text }]}>
                {savingAvatar ? "Saving Photo…" : "Change Photo"}
              </Text>
            </Pressable>
          </View>

          <IdentityRow
            label="Username"
            value={loginUsername}
            action="Change"
            onPress={() => (router as any).push("/change-username")}
          />

          <View style={[S.divider, { backgroundColor: tokens.border }]} />

          <IdentityRow
            label="Login Email"
            value={loginEmail}
            action="Change"
            onPress={() => (router as any).push("/change-email")}
          />

          <Text style={[S.identityNote, { color: tokens.cardText }]}>
            Username and login email use separate, protected change flows.
          </Text>
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
          <Text style={[S.sectionTitle, { color: tokens.text }]}>
            Security
          </Text>

          <Text style={[S.smallNote, { color: tokens.cardText }]}>
            Password-reset messages are sent to your current login email.
          </Text>

          <Pressable onPress={onForgotPassword} style={S.textLinkWrap}>
            <Text style={S.textLink}>
              Forgot password? Send reset email
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              Alert.alert(
                "Your login email",
                loginEmail || "No login email is available."
              )
            }
            style={S.textLinkWrap}
          >
            <Text style={S.textLink}>
              Forgot which email you used?
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              Alert.alert(
                "Your username",
                loginUsername || "No username is available."
              )
            }
            style={S.textLinkWrap}
          >
            <Text style={S.textLink}>Forgot your username?</Text>
          </Pressable>
        </View>

        <Pressable
          style={[
            S.signOutButton,
            {
              borderColor: isLoggedIn ? "#ff6b6b" : tokens.accent,
              backgroundColor: tokens.isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.05)",
            },
          ]}
          onPress={onSignOut}
        >
          <Text style={[S.signOutText, { color: tokens.text }]}>
            {isLoggedIn ? "Sign Out" : "Login / Register"}
          </Text>
        </Pressable>

        <Pressable
          style={[
            S.removeButton,
            { opacity: isLoggedIn ? 1 : 0.45 },
          ]}
          disabled={!isLoggedIn}
          onPress={() => {
            setDeletePassword("");
            setShowDeleteModal(true);
          }}
        >
          <Text style={S.removeText}>
            Delete My Account Permanently
          </Text>
        </Pressable>

        <Text style={[S.removeNote, { color: tokens.cardText }]}>
          Permanently deletes your Nova login and account data. This cannot
          be undone. App Store purchase records held by Apple are separate.
        </Text>

        <View style={S.community}>
          <Pressable
            onPress={onJoinDiscord}
            style={[
              S.discordButton,
              {
                borderColor: tokens.accent,
                backgroundColor: tokens.isDark
                  ? "rgba(0,255,200,0.18)"
                  : "rgba(0,160,220,0.12)",
              },
            ]}
          >
            <Text style={[S.discordText, { color: tokens.text }]}>
              🗯️ Join our Discord
            </Text>
          </Pressable>

          <Pressable onPress={onContactUs} style={S.textLinkWrap}>
            <Text style={S.textLink}>Contact Us</Text>
          </Pressable>

          <Pressable
            onPress={() => setShowPrivacyModal(true)}
            style={S.textLinkWrap}
          >
            <Text style={S.textLink}>Privacy Policy</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deletingAccount) {
            setShowDeleteModal(false);
            setDeletePassword("");
          }
        }}
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
              Permanently delete this account?
            </Text>

            <Text style={[S.modalBody, { color: tokens.cardText }]}>
              This permanently removes your Nova Tutoring login, username,
              profile, avatar, messages, achievements, quiz results,
              transaction records, purchases stored by Nova, and saved
              progress. This action cannot be undone.
            </Text>

            <Text
              style={[
                S.deletePasswordLabel,
                { color: tokens.cardText },
              ]}
            >
              Current password
            </Text>

            <TextInput
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!deletingAccount}
              placeholder="Enter current password"
              placeholderTextColor="#77798a"
              style={[
                S.deletePasswordInput,
                {
                  color: tokens.text,
                  borderColor: tokens.border,
                  backgroundColor: tokens.isDark
                    ? "rgba(0,0,0,0.24)"
                    : "rgba(255,255,255,0.75)",
                },
              ]}
            />

            <View style={S.modalRow}>
              <Pressable
                disabled={deletingAccount}
                style={[
                  S.modalButton,
                  {
                    borderColor: tokens.border,
                    opacity: deletingAccount ? 0.5 : 1,
                  },
                ]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeletePassword("");
                }}
              >
                <Text style={[S.modalButtonText, { color: tokens.text }]}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                disabled={deletingAccount}
                style={[
                  S.modalButton,
                  {
                    borderColor: "#ff2b2b",
                    backgroundColor: "rgba(255,43,43,0.13)",
                    opacity: deletingAccount ? 0.65 : 1,
                  },
                ]}
                onPress={handleConfirmDelete}
              >
                {deletingAccount ? (
                  <ActivityIndicator color="#ff8d8d" />
                ) : (
                  <Text style={[S.modalButtonText, { color: "#ff8d8d" }]}>
                    Delete Forever
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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

            <ScrollView style={S.privacyScroll}>
              <Text style={[S.modalBody, { color: tokens.cardText }]}>
                Nova Tutoring stores profile information, progress, coins,
                achievements, quiz history, and purchases locally and, for
                signed-in users, in its online database.{"\n\n"}
                Login-email changes are handled by Supabase Auth. Username
                changes are recorded and protected by database rules.{"\n\n"}
                Nova Tutoring does not sell personal information or display
                third-party ads inside the app. Payment providers process
                payment details, which are not stored directly by Nova
                Tutoring.{"\n\n"}
                Contact support for questions about account or order records.
              </Text>
            </ScrollView>

            <Pressable
              style={[S.modalButton, { borderColor: tokens.border }]}
              onPress={() => setShowPrivacyModal(false)}
            >
              <Text style={[S.modalButtonText, { color: tokens.text }]}>
                Close
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const S = StyleSheet.create({
  flex: { flex: 1 },
  wrap: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  h1: {
    fontSize: 22,
    fontWeight: "900",
  },
  card: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 16,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    overflow: "hidden",
  },
  avatar: {
    width: 96,
    height: 96,
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSavingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 34,
    fontWeight: "900",
  },
  photoButton: {
    marginTop: 10,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  photoButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  identityText: {
    flex: 1,
  },
  identityLabel: {
    fontSize: 12,
    marginBottom: 3,
  },
  identityValue: {
    fontSize: 16,
    fontWeight: "900",
  },
  smallButton: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  smallButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
  },
  identityNote: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 14,
  },
  smallNote: {
    fontSize: 12,
    lineHeight: 17,
  },
  textLinkWrap: {
    marginTop: 10,
    alignItems: "center",
  },
  textLink: {
    color: "#9ad8ff",
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  signOutButton: {
    borderWidth: 1.5,
    borderRadius: 12,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "900",
  },
  removeButton: {
    borderWidth: 1.5,
    borderColor: "#ff2b2b",
    backgroundColor: "rgba(255,43,43,0.16)",
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  removeText: {
    color: "#ff9ea8",
    fontSize: 14,
    fontWeight: "900",
  },
  removeNote: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: "center",
  },
  community: {
    marginTop: 12,
    alignItems: "center",
  },
  discordButton: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  discordText: {
    fontSize: 14,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.58)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 18,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 10,
  },
  modalBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  deletePasswordLabel: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 18,
    marginBottom: 7,
  },
  deletePasswordInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  modalRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  modalButton: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
  privacyScroll: {
    maxHeight: 350,
  },
});