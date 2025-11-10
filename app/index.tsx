// app/index.tsx
import React, { useRef, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Image, Animated, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import * as Haptics from "expo-haptics";

export default function HomeScreen() {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Subtle pulsing animation
  useEffect(() => {
    Animated.loop(
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
    ).start();
  }, [pulseAnim]);

  const handlePress = async () => {
    // ✅ Guard haptics for web
    if (Platform.OS !== "web") {
      await Haptics.selectionAsync().catch(() => {});
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Image
        source={require("./assets/logo.png")}  // ✅ Correct relative path
        style={styles.logo}
      />

      {/* Let’s Learn button */}
      <Link href="/ask" asChild>
        <Pressable onPress={handlePress}>
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
      </Link>

      {/* Login button */}
      <Link href="/account" asChild>
        <Pressable onPress={handlePress}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <LinearGradient
              colors={["#00e5ff", "#66b2ff", "#000000"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Login</Text>
            </LinearGradient>
          </Animated.View>
        </Pressable>
      </Link>
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
});
