// app/(tabs)/discord.tsx
import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";

import { useTheme } from "../context/ThemeContext";

const DISCORD_INVITE_URL = "https://discord.gg/NR9PAjtrg";

export default function DiscordScreen() {
  const { tokens } = useTheme();

  const handleOpenDiscord = () => {
    if (!DISCORD_INVITE_URL) {
      Alert.alert(
        "Discord link not set",
        "The Discord invite link isn't configured yet."
      );
      return;
    }

    try {
      Linking.openURL(DISCORD_INVITE_URL);
    } catch (e) {
      Alert.alert(
        "Could not open Discord",
        "Please check your internet connection or open the link from the App Store listing."
      );
    }
  };

  return (
    <LinearGradient colors={tokens.gradient} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.wrap}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            {
              borderColor: tokens.border,
              backgroundColor: tokens.isDark
                ? "rgba(0, 10, 20, 0.9)"
                : "rgba(255, 255, 255, 0.95)",
            },
          ]}
        >
          <Text style={[styles.title, { color: tokens.accent }]}>
            Nova Tutoring Discord
          </Text>

          <Text style={[styles.subtitle, { color: tokens.cardText }]}>
            Come hang out with other learners, share your wins, and get
            sneak peeks of new features.
          </Text>

          <View style={styles.bullets}>
            <Text style={[styles.bullet, { color: tokens.text }]}>
              • Study tips and motivation
            </Text>
            <Text style={[styles.bullet, { color: tokens.text }]}>
              • Updates on new Nova Tutoring features
            </Text>
            <Text style={[styles.bullet, { color: tokens.text }]}>
              • A place to ask questions and celebrate progress
            </Text>
          </View>

          <View style={{ marginTop: 18 }}>
            <Text style={[styles.inviteLabel, { color: tokens.cardText }]}>
              Invite link:
            </Text>
            <Text style={[styles.inviteText, { color: tokens.text }]}>
              {DISCORD_INVITE_URL}
            </Text>
          </View>

          <Pressable
            onPress={handleOpenDiscord}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: tokens.accent,
                borderColor: tokens.border,
              },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {Platform.OS === "ios" || Platform.OS === "android"
                ? "Open in Discord App"
                : "Open Discord"}
            </Text>
          </Pressable>

          <Text style={[styles.footerNote, { color: tokens.cardText }]}>
            If the button doesn’t work, you can copy the invite link above
            and open it directly in your browser or the Discord app.
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 32,
    justifyContent: "center",
  },
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 13,
    textAlign: "center",
  },
  bullets: {
    marginTop: 16,
    gap: 4,
  },
  bullet: {
    fontSize: 13,
    fontWeight: "500",
  },
  inviteLabel: {
    fontSize: 12,
    marginTop: 10,
  },
  inviteText: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  primaryBtn: {
    marginTop: 18,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#001018",
  },
  footerNote: {
    marginTop: 12,
    fontSize: 11,
    textAlign: "center",
  },
});
