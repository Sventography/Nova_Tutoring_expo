// app/index.tsx
import React, { useRef, useEffect } from "react";
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

const TUTORIAL_KEY = "onboarding.tutorial.done.v1";

export default function HomeScreen() {
  const router = useRouter();
  const { isLoggedIn } = (useUser() || {}) as any;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // One-time tutorial gate (shows only once ever)
  useEffect(() => {
    (async () => {
      try {
        const done = await AsyncStorage.getItem(TUTORIAL_KEY);
        if (!done) {
          router.replace("/tutorial");
        }
      } catch {
        // ignore tutorial errors
      }
    })();
  }, [router]);

  // Subtle pulsing animation
  useEffect(() => {
    Animated.loop(
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
    ).start();
  }, [pulseAnim]);

  const hapticTap = async () => {
    if (Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {
        // ignore haptics errors
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
    } else {
      router.push("/sign-in");
    }
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
    router.replace("/tutorial");
  };

  return (
    <View style={styles.container}>
      {/* Logo (long-press to reset tutorial) */}
      <Pressable onLongPress={handleResetTutorial} delayLongPress={500}>
        <Image source={require("./assets/logo.png")} style={styles.logo} />
      </Pressable>

      {/* Let’s Learn button */}
      <Pressable onPress={handleLetsLearn}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <LinearGradient
            colors={["#00e5ff", "#66b2ff", "#000000"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Let’s Learn</Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>

      {/* Login / Account button */}
      <Pressable onPress={handleLoginPress}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <LinearGradient
            colors={["#00e5ff", "#66b2ff", "#000000"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {isLoggedIn ? "Go to Account" : "Log In"}
            </Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>

      {/* Subtitle (only when logged out) */}
      {!isLoggedIn && (
        <Text style={styles.subtitle}>Log in to save your progress!</Text>
      )}

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