// app/sign-in.tsx

import React, {
  useState,
} from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";

import { useTheme } from "./context/ThemeContext";
import { useUser } from "./context/UserContext";
import { DISCORD_INVITE_URL } from "./constants/community";
import { showToast } from "./utils/toast";

const PENDING_CONFIRMATION_EMAIL_KEY =
  "nova.auth.pending-confirmation-email.v1";

type Mode = "signup" | "login";

function normalizeEmail(
  value: string
): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function errorCode(
  error: any
): string {
  return String(
    error?.code ||
      error?.error_code ||
      ""
  )
    .trim()
    .toUpperCase();
}

function errorMessage(
  error: any
): string {
  return String(
    error?.message ||
      error ||
      ""
  ).trim();
}

export default function SignInScreen() {
  const router = useRouter();

  const params =
    useLocalSearchParams<{
      email?: string | string[];
      mode?: string | string[];
    }>();

  const { tokens } = useTheme();

  const {
    signUpWithEmailPassword,
    loginWithEmailPassword,
    resetPassword,
    ready,
  } = useUser() as any;

  /*
   * Route values are read once as initial state only.
   * They can never overwrite a field while the user is typing.
   */
  const rawInitialMode = Array.isArray(
    params.mode
  )
    ? params.mode[0]
    : params.mode;

  const rawInitialEmail = Array.isArray(
    params.email
  )
    ? params.email[0]
    : params.email;

  const initialLoginEmail =
    normalizeEmail(
      String(rawInitialEmail || "")
    );

  const [mode, setMode] =
    useState<Mode>(() =>
      rawInitialMode === "login"
        ? "login"
        : "signup"
    );

  const [
    suUsername,
    setSuUsername,
  ] = useState("");
  const [suEmail, setSuEmail] =
    useState("");
  const [
    suPassword,
    setSuPassword,
  ] = useState("");
  const [
    suConfirmPassword,
    setSuConfirmPassword,
  ] = useState("");

  const [liEmail, setLiEmail] =
    useState(initialLoginEmail);
  const [
    liPassword,
    setLiPassword,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    discordVisible,
    setDiscordVisible,
  ] = useState(false);

  const hapticTap = async () => {
    if (Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(
          Haptics
            .ImpactFeedbackStyle
            .Medium
        );
      } catch {}
    }
  };

  const switchMode = async (
    next: Mode
  ) => {
    if (
      mode === next ||
      loading
    ) {
      return;
    }

    await hapticTap();
    setMode(next);
  };

  const goToMainTabs = () => {
    (router as any).replace(
      "/(tabs)/ask"
    );
  };

  const goToLoginWithEmail = (
    email: string
  ) => {
    setLiEmail(
      normalizeEmail(email)
    );
    setLiPassword("");
    setMode("login");
  };

  const sendResetEmail = async (
    emailValue: string
  ) => {
    const email =
      normalizeEmail(emailValue);

    if (!email) {
      Alert.alert(
        "Enter your email",
        "Enter the account email first."
      );
      return;
    }

    try {
      await resetPassword(email);

      Alert.alert(
        "Check your email",
        `We sent password-reset instructions to:\n\n${email}`
      );
    } catch (error: any) {
      Alert.alert(
        "Could not send reset email",
        errorMessage(error) ||
          "Please try again."
      );
    }
  };

  const handleSignUp = async () => {
    if (loading) return;

    const username =
      suUsername.trim();
    const email =
      normalizeEmail(suEmail);
    const password = suPassword;
    const confirmPassword =
      suConfirmPassword;

    if (
      !username ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert(
        "Missing info",
        "Please fill out all fields."
      );
      return;
    }

    if (
      !email.includes("@") ||
      !email.includes(".")
    ) {
      Alert.alert(
        "Invalid email",
        "Enter a valid email address."
      );
      return;
    }

    if (username.length < 3) {
      Alert.alert(
        "Username too short",
        "Usernames must be at least 3 characters long."
      );
      return;
    }

    if (username.length > 8) {
      Alert.alert(
        "Username too long",
        "Usernames can be up to 8 characters long."
      );
      return;
    }

    if (
      !/^[A-Za-z0-9_]+$/.test(
        username
      )
    ) {
      Alert.alert(
        "Invalid username",
        "Use only letters, numbers, and underscores."
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Weak password",
        "Please use a password with at least 6 characters."
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      Alert.alert(
        "Passwords do not match",
        "Make sure both password fields match."
      );
      return;
    }

    setLoading(true);

    try {
      await hapticTap();

      const result =
        await signUpWithEmailPassword(
          username,
          email,
          password
        );

      const confirmationEmail =
        normalizeEmail(
          String(
            result?.email ||
              email
          )
        );

      if (
        result
          ?.needsEmailConfirmation
      ) {
        await AsyncStorage.setItem(
          PENDING_CONFIRMATION_EMAIL_KEY,
          confirmationEmail
        );

        showToast(
          "Account created! Check your email for the code."
        );

        (router as any).replace({
          pathname:
            "/confirm-email",
          params: {
            email:
              confirmationEmail,
          },
        });

        return;
      }

      await AsyncStorage.removeItem(
        PENDING_CONFIRMATION_EMAIL_KEY
      );

      await new Promise(
        (resolve) =>
          setTimeout(resolve, 150)
      );

      showToast(
        "Account created! You’re signed in."
      );
      goToMainTabs();
    } catch (error: any) {
      console.log(
        "signUp error:",
        error
      );

      const code =
        errorCode(error);
      const message =
        errorMessage(error);
      const lower =
        message.toLowerCase();

      if (
        code ===
          "EMAIL_ALREADY_REGISTERED" ||
        lower.includes(
          "email is already in use"
        ) ||
        lower.includes(
          "account with this email"
        )
      ) {
        await AsyncStorage.removeItem(
          PENDING_CONFIRMATION_EMAIL_KEY
        ).catch(() => {});

        Alert.alert(
          "Email already in use",
          "An account already exists with this email. Log in or reset the password instead.",
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text:
                "Reset Password",
              onPress: () => {
                void sendResetEmail(
                  email
                );
              },
            },
            {
              text: "Go to Login",
              onPress: () =>
                goToLoginWithEmail(
                  email
                ),
            },
          ]
        );
      } else if (
        code ===
          "USERNAME_TAKEN" ||
        lower.includes(
          "already taken"
        )
      ) {
        Alert.alert(
          "Username already taken",
          "That username is already taken. Please choose another."
        );
      } else if (
        code.includes(
          "RATE_LIMIT"
        ) ||
        lower.includes(
          "rate limit"
        ) ||
        lower.includes(
          "too many"
        ) ||
        lower.includes(
          "email rate"
        )
      ) {
        Alert.alert(
          "Too many emails",
          "We’ve sent too many emails recently. Please wait a little while and try again."
        );
      } else {
        Alert.alert(
          "Sign up error",
          message ||
            "Could not sign up right now."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (loading) return;

    const email =
      normalizeEmail(liEmail);
    const password = liPassword;

    if (
      !email ||
      !password
    ) {
      Alert.alert(
        "Missing info",
        "Please enter your email and password."
      );
      return;
    }

    setLoading(true);

    try {
      await hapticTap();

      await loginWithEmailPassword(
        email,
        password
      );

      await AsyncStorage.removeItem(
        PENDING_CONFIRMATION_EMAIL_KEY
      );

      await new Promise(
        (resolve) =>
          setTimeout(resolve, 150)
      );

      showToast(
        "Welcome back! You’re signed in."
      );
      goToMainTabs();
    } catch (error: any) {
      console.log(
        "login error:",
        error
      );

      const message =
        errorMessage(error);
      const lower =
        message.toLowerCase();

      if (
        lower.includes(
          "confirm your email"
        ) ||
        lower.includes(
          "email not confirmed"
        )
      ) {
        await AsyncStorage.setItem(
          PENDING_CONFIRMATION_EMAIL_KEY,
          email
        );

        Alert.alert(
          "Email not confirmed",
          "Enter the code from your Nova Tutoring email, or resend the confirmation message.",
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Enter Code",
              onPress: () =>
                (router as any).replace(
                  {
                    pathname:
                      "/confirm-email",
                    params: {
                      email,
                    },
                  }
                ),
            },
          ]
        );
      } else {
        Alert.alert(
          "Login error",
          message ||
            "Could not log you in right now."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDiscord =
    async () => {
      if (
        !DISCORD_INVITE_URL
      ) {
        Alert.alert(
          "Discord link not configured",
          "Create a permanent Discord invite and add EXPO_PUBLIC_DISCORD_INVITE_URL to the EAS environment."
        );
        return;
      }

      try {
        setDiscordVisible(false);
        await Linking.openURL(
          DISCORD_INVITE_URL
        );
      } catch {
        Alert.alert(
          "Could not open Discord",
          "The Discord invite could not be opened. Please check that the invite is permanent and still valid."
        );
      }
    };

  const isSignup =
    mode === "signup";

  const subtitle = isSignup
    ? "Create an account to save your progress!"
    : "Log in to see your saved progress!";

  const inputStyle = {
    borderColor: tokens.border,
    backgroundColor:
      tokens.card,
    color: tokens.text,
  } as const;

  const cardBackground = {
    backgroundColor:
      tokens.isDark
        ? "rgba(0, 8, 16, 0.92)"
        : "rgba(255,255,255,0.94)",
  } as const;

  return (
    <LinearGradient
      colors={tokens.gradient}
      style={styles.flex}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.card,
              cardBackground,
              {
                borderColor:
                  tokens.border,
              },
            ]}
          >
            <View
              style={[
                styles.headerRow,
                {
                  borderColor:
                    tokens.border,
                },
              ]}
            >
              <Pressable
                style={[
                  styles.headerTab,
                  isSignup &&
                    styles.headerTabActive,
                ]}
                onPress={() =>
                  void switchMode(
                    "signup"
                  )
                }
                disabled={loading}
              >
                <Text
                  style={[
                    styles.headerTabText,
                    {
                      color:
                        isSignup
                          ? tokens.text
                          : tokens
                              .cardText,
                    },
                  ]}
                >
                  Sign Up
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.headerTab,
                  !isSignup &&
                    styles.headerTabActive,
                ]}
                onPress={() =>
                  void switchMode(
                    "login"
                  )
                }
                disabled={loading}
              >
                <Text
                  style={[
                    styles.headerTabText,
                    {
                      color:
                        !isSignup
                          ? tokens.text
                          : tokens
                              .cardText,
                    },
                  ]}
                >
                  Log In
                </Text>
              </Pressable>
            </View>

            <Text
              style={[
                styles.subtitle,
                {
                  color:
                    tokens.cardText,
                },
              ]}
            >
              {subtitle}
            </Text>

            {!ready ? (
              <Text
                style={[
                  styles.syncText,
                  {
                    color:
                      tokens.cardText,
                  },
                ]}
              >
                Syncing account
                services…
              </Text>
            ) : null}

            {isSignup ? (
              <View
                style={styles.form}
              >
                <Text
                  style={[
                    styles.label,
                    {
                      color:
                        tokens.cardText,
                    },
                  ]}
                >
                  Username
                </Text>

                <TextInput
                  value={suUsername}
                  onChangeText={
                    setSuUsername
                  }
                  placeholder="NovaUser"
                  placeholderTextColor="#6b7685"
                  style={[
                    styles.input,
                    inputStyle,
                  ]}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={8}
                  editable={!loading}
                />

                <Text
                  style={[
                    styles.label,
                    {
                      color:
                        tokens.cardText,
                    },
                  ]}
                >
                  Email
                </Text>

                <TextInput
                  value={suEmail}
                  onChangeText={
                    setSuEmail
                  }
                  placeholder="you@example.com"
                  placeholderTextColor="#6b7685"
                  style={[
                    styles.input,
                    inputStyle,
                  ]}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  editable={!loading}
                />

                <Text
                  style={[
                    styles.label,
                    {
                      color:
                        tokens.cardText,
                    },
                  ]}
                >
                  Password
                </Text>

                <TextInput
                  value={suPassword}
                  onChangeText={
                    setSuPassword
                  }
                  placeholder="••••••••"
                  placeholderTextColor="#6b7685"
                  style={[
                    styles.input,
                    inputStyle,
                  ]}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  editable={!loading}
                />

                <Text
                  style={[
                    styles.label,
                    {
                      color:
                        tokens.cardText,
                    },
                  ]}
                >
                  Confirm Password
                </Text>

                <TextInput
                  value={
                    suConfirmPassword
                  }
                  onChangeText={
                    setSuConfirmPassword
                  }
                  placeholder="••••••••"
                  placeholderTextColor="#6b7685"
                  style={[
                    styles.input,
                    inputStyle,
                  ]}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  editable={!loading}
                  onSubmitEditing={() => {
                    if (!loading) {
                      void handleSignUp();
                    }
                  }}
                />

                <Pressable
                  onPress={() =>
                    void handleSignUp()
                  }
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    {
                      backgroundColor:
                        tokens.accent,
                    },
                    pressed &&
                      styles.pressed,
                    loading &&
                      styles.disabled,
                  ]}
                >
                  <Text
                    style={
                      styles.primaryBtnText
                    }
                  >
                    {loading
                      ? "Creating account…"
                      : "Create Account"}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View
                style={styles.form}
              >
                <Text
                  style={[
                    styles.label,
                    {
                      color:
                        tokens.cardText,
                    },
                  ]}
                >
                  Email
                </Text>

                <View
                  style={[
                    styles.loginEmailShell,
                    {
                      borderColor:
                        tokens.border,
                      backgroundColor:
                        tokens.card,
                    },
                  ]}
                >
                  <Text
                    pointerEvents="none"
                    numberOfLines={1}
                    style={[
                      styles.loginEmailMirror,
                      {
                        color: liEmail
                          ? tokens.text
                          : "#6b7685",
                      },
                    ]}
                  >
                    {liEmail ||
                      "you@example.com"}
                  </Text>

                  <TextInput
                    value={liEmail}
                    onChangeText={
                      setLiEmail
                    }
                    style={
                      styles.loginEmailNativeInput
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    keyboardType="email-address"
                    inputMode="email"
                    autoComplete="off"
                    textContentType="none"
                    importantForAutofill="no"
                    editable={!loading}
                    returnKeyType="next"
                    selectionColor={
                      tokens.accent
                    }
                    accessibilityLabel="Login email"
                  />
                </View>

                <Text
                  style={[
                    styles.label,
                    {
                      color:
                        tokens.cardText,
                    },
                  ]}
                >
                  Password
                </Text>

                <TextInput
                  value={liPassword}
                  onChangeText={
                    setLiPassword
                  }
                  placeholder="••••••••"
                  placeholderTextColor="#6b7685"
                  style={[
                    styles.input,
                    inputStyle,
                  ]}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  textContentType="none"
                  importantForAutofill="no"
                  editable={!loading}
                  onSubmitEditing={() => {
                    if (!loading) {
                      void handleLogin();
                    }
                  }}
                />

                <Pressable
                  onPress={() =>
                    void handleLogin()
                  }
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    {
                      backgroundColor:
                        tokens.accent,
                    },
                    pressed &&
                      styles.pressed,
                    loading &&
                      styles.disabled,
                  ]}
                >
                  <Text
                    style={
                      styles.primaryBtnText
                    }
                  >
                    {loading
                      ? "Logging in…"
                      : "Log In"}
                  </Text>
                </Pressable>

                <Pressable
                  disabled={loading}
                  onPress={() =>
                    void sendResetEmail(
                      liEmail
                    )
                  }
                  style={
                    styles.linkButton
                  }
                >
                  <Text
                    style={
                      styles.linkText
                    }
                  >
                    Forgot Password?
                  </Text>
                </Pressable>
              </View>
            )}

            <Pressable
              onPress={() =>
                setDiscordVisible(
                  true
                )
              }
              disabled={loading}
              style={
                styles.discordButton
              }
            >
              <Text
                style={
                  styles.discordText
                }
              >
                💬 Join the Nova
                Tutoring Discord
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                (router as any).replace(
                  "/"
                )
              }
              disabled={loading}
              style={styles.backButton}
            >
              <Text
                style={styles.backText}
              >
                ← Back to Home
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={discordVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setDiscordVisible(false)
        }
      >
        <View
          style={
            styles.modalBackdrop
          }
        >
          <View
            style={
              styles.modalCard
            }
          >
            <Text
              style={
                styles.modalTitle
              }
            >
              Join the Nova
              Tutoring Discord
            </Text>

            <Text
              style={styles.modalBody}
            >
              Get study tips,
              updates, sneak peeks,
              and help from the Nova
              community.
            </Text>

            <View
              style={
                styles.modalButtons
              }
            >
              <Pressable
                onPress={() =>
                  setDiscordVisible(
                    false
                  )
                }
                style={[
                  styles.modalButton,
                  styles
                    .secondaryModalButton,
                ]}
              >
                <Text
                  style={
                    styles
                      .secondaryModalText
                  }
                >
                  Close
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  void handleOpenDiscord()
                }
                style={[
                  styles.modalButton,
                  styles
                    .primaryModalButton,
                ]}
              >
                <Text
                  style={
                    styles
                      .primaryModalText
                  }
                >
                  Open Discord
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 18,
  },
  headerRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  headerTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  headerTabActive: {
    backgroundColor:
      "rgba(0,229,255,0.16)",
  },
  headerTabText: {
    fontSize: 16,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 18,
    textAlign: "center",
    fontSize: 15,
  },
  syncText: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 11,
    opacity: 0.75,
  },
  form: {
    marginTop: 20,
  },
  label: {
    marginTop: 12,
    marginBottom: 7,
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  loginEmailShell: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
  },
  loginEmailMirror: {
    position: "absolute",
    left: 14,
    right: 14,
    fontSize: 16,
    lineHeight: 22,
    zIndex: 1,
  },
  loginEmailNativeInput: {
    minHeight: 50,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "transparent",
    backgroundColor: "transparent",
    zIndex: 2,
  },
  primaryBtn: {
    marginTop: 22,
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#001018",
    fontSize: 16,
    fontWeight: "900",
  },
  linkButton: {
    alignSelf: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  linkText: {
    color: "#70dfff",
    fontWeight: "800",
  },
  discordButton: {
    marginTop: 18,
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  discordText: {
    color: "#79e7ff",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  backButton: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  backText: {
    color: "#9aa5b1",
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.6,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
    backgroundColor:
      "rgba(0,0,0,0.72)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    padding: 22,
    borderRadius: 20,
    borderWidth: 1,
    borderColor:
      "rgba(0,229,255,0.55)",
    backgroundColor: "#11131c",
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
  },
  modalBody: {
    marginTop: 14,
    color: "#c7ccd4",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  modalButtons: {
    marginTop: 22,
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryModalButton: {
    borderWidth: 1,
    borderColor: "#59606d",
  },
  primaryModalButton: {
    backgroundColor: "#00e5ff",
  },
  secondaryModalText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  primaryModalText: {
    color: "#001018",
    fontWeight: "900",
  },
});