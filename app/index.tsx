// app/index.tsx

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { useUser } from "./context/UserContext";
import { useIsland } from "./context/IslandContext";

const TUTORIAL_KEY = "onboarding.tutorial.done.v2";
const PENDING_CONFIRMATION_EMAIL_KEY =
  "nova.auth.pending-confirmation-email.v1";

type StartupDestination =
  | { type: "checking" }
  | { type: "home" }
  | { type: "tutorial" }
  | { type: "confirm-email"; email: string };

export default function HomeScreen() {
  const router = useRouter();
  const { isLoggedIn, ready } = (useUser() || {}) as any;
  const { grantDailyLoginXpIfNeeded } = useIsland();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [startupDestination, setStartupDestination] =
    useState<StartupDestination>({ type: "checking" });

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    async function chooseStartupDestination() {
      try {
        if (isLoggedIn) {
          await AsyncStorage.removeItem(
            PENDING_CONFIRMATION_EMAIL_KEY
          );
        } else {
          const pendingEmail = String(
            (await AsyncStorage.getItem(
              PENDING_CONFIRMATION_EMAIL_KEY
            )) || ""
          )
            .trim()
            .toLowerCase();

          if (pendingEmail) {
            if (!cancelled) {
              setStartupDestination({
                type: "confirm-email",
                email: pendingEmail,
              });
            }
            return;
          }
        }

        const tutorialDone =
          await AsyncStorage.getItem(TUTORIAL_KEY);

        if (cancelled) return;

        setStartupDestination(
          tutorialDone === "1"
            ? { type: "home" }
            : { type: "tutorial" }
        );
      } catch (error) {
        console.warn(
          "[HomeScreen] startup routing error:",
          error
        );

        if (!cancelled) {
          setStartupDestination({ type: "tutorial" });
        }
      }
    }

    void chooseStartupDestination();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, ready]);

  useEffect(() => {
    void grantDailyLoginXpIfNeeded().catch(() => {});
  }, [grantDailyLoginXpIfNeeded]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  const hapticTap = async () => {
    if (Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(
          Haptics.ImpactFeedbackStyle.Heavy
        );
      } catch {}
    }
  };

  const handleLetsLearn = async () => {
    await hapticTap();
    (router as any).push("/ask");
  };

  const handleLoginPress = async () => {
    await hapticTap();

    if (isLoggedIn) {
      (router as any).push("/(tabs)/account");
      return;
    }

    (router as any).push("/sign-in");
  };

  const handleResetTutorial = async () => {
    if (Platform.OS !== "web") {
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      } catch {}
    }

    try {
      await AsyncStorage.removeItem(TUTORIAL_KEY);
    } catch {}

    setStartupDestination({ type: "tutorial" });
  };

  if (
    !ready ||
    startupDestination.type === "checking"
  ) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require("./assets/logo.png")}
          style={styles.loadingLogo}
        />
        <ActivityIndicator
          size="large"
          color="#00e5ff"
        />
        <Text style={styles.loadingText}>
          Starting Nova…
        </Text>
      </View>
    );
  }

  if (startupDestination.type === "tutorial") {
    return <Redirect href={"/tutorial" as any} />;
  }

  if (
    startupDestination.type === "confirm-email"
  ) {
    return (
      <Redirect
        href={
          {
            pathname: "/confirm-email",
            params: {
              email: startupDestination.email,
            },
          } as any
        }
      />
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        onLongPress={handleResetTutorial}
        delayLongPress={500}
      >
        <Image
          source={require("./assets/logo.png")}
          style={styles.logo}
        />
      </Pressable>

      <Pressable onPress={handleLetsLearn}>
        <Animated.View
          style={{
            transform: [{ scale: pulseAnim }],
          }}
        >
          <LinearGradient
            colors={[
              "#00e5ff",
              "#66b2ff",
              "#000000",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {isLoggedIn
                ? "Let’s Learn"
                : "Continue as Guest"}
            </Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>

      <Pressable onPress={handleLoginPress}>
        <Animated.View
          style={{
            transform: [{ scale: pulseAnim }],
          }}
        >
          <LinearGradient
            colors={[
              "#00e5ff",
              "#66b2ff",
              "#000000",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {isLoggedIn
                ? "Go to Account"
                : "Login / Register"}
            </Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>

      {!isLoggedIn ? (
        <Text style={styles.subtitle}>
          Log in or register to save your
          progress.
        </Text>
      ) : null}

      <Text style={styles.hint}>
        Tip: Long-press the logo to replay the
        tutorial.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: "black",
  },
  loadingLogo: {
    width: 180,
    height: 180,
    resizeMode: "contain",
    marginBottom: 8,
  },
  loadingText: {
    color: "#9aa",
    fontSize: 14,
    fontWeight: "600",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "black",
  },
  logo: {
    width: 240,
    height: 240,
    resizeMode: "contain",
    marginBottom: 70,
  },
  button: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    color: "#9aa",
    fontSize: 13,
  },
  hint: {
    marginTop: 18,
    color: "#666",
    fontSize: 12,
  },
});