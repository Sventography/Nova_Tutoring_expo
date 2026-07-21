// app/index.tsx

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  Animated,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useUser } from "./context/UserContext";
import { useIsland } from "./context/IslandContext";

const TUTORIAL_KEY = "onboarding.tutorial.done.v1";
const PENDING_CONFIRMATION_EMAIL_KEY =
  "nova.auth.pending-confirmation-email.v1";

export default function HomeScreen() {
  const router = useRouter();
  const { isLoggedIn, ready } = (useUser() || {}) as any;
  const { grantDailyLoginXpIfNeeded } = useIsland();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const startupRouteHandledRef = useRef(false);

  useEffect(() => {
    if (!ready || startupRouteHandledRef.current) {
      return;
    }

    let cancelled = false;

    async function chooseStartupRoute() {
      try {
        // A successful login or code confirmation makes any old pending
        // confirmation reminder obsolete.
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

          if (pendingEmail && !cancelled) {
            startupRouteHandledRef.current = true;

            router.replace({
              pathname: "/confirm-email",
              params: {
                email: pendingEmail,
              },
            });

            return;
          }
        }

        const tutorialDone = await AsyncStorage.getItem(TUTORIAL_KEY);

        if (!tutorialDone && !cancelled) {
          startupRouteHandledRef.current = true;
          router.replace("/tutorial");
          return;
        }

        startupRouteHandledRef.current = true;
      } catch (error) {
        console.warn("[HomeScreen] startup routing error:", error);
        startupRouteHandledRef.current = true;
      }
    }

    void chooseStartupRoute();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, ready, router]);

  useEffect(() => {
    grantDailyLoginXpIfNeeded().catch(() => {});
  }, [grantDailyLoginXpIfNeeded]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulseAnim]);

  const hapticTap = async () => {
    if (Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(
          Haptics.ImpactFeedbackStyle.Heavy
        );
      } catch {
        // Ignore haptics errors.
      }
    }
  };

  const handleLetsLearn = async () => {
    await hapticTap();
    router.push("/ask");
  };

  const handleLoginPress = async () => {
    await hapticTap();

    if (isLoggedIn) {
      router.push("/(tabs)/account");
      return;
    }

    router.push("/sign-in");
  };

  const handleResetTutorial = async () => {
    if (Platform.OS !== "web") {
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      } catch {
        // Ignore haptics errors.
      }
    }

    try {
      await AsyncStorage.removeItem(TUTORIAL_KEY);
    } catch {
      // Ignore storage errors.
    }

    router.replace("/tutorial");
  };

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
          style={{ transform: [{ scale: pulseAnim }] }}
        >
          <LinearGradient
            colors={["#00e5ff", "#66b2ff", "#000000"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {isLoggedIn ? "Let’s Learn" : "Continue as Guest"}
            </Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>

      <Pressable onPress={handleLoginPress}>
        <Animated.View
          style={{ transform: [{ scale: pulseAnim }] }}
        >
          <LinearGradient
            colors={["#00e5ff", "#66b2ff", "#000000"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {isLoggedIn ? "Go to Account" : "Login / Register"}
            </Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>

      {!isLoggedIn ? (
        <Text style={styles.subtitle}>
          Log in or register to save your progress.
        </Text>
      ) : null}

      <Text style={styles.hint}>
        Tip: Long-press the logo to replay the tutorial.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
