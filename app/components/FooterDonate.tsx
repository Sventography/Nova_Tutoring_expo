import React from "react";
import { View, Text, Pressable, StyleSheet, Linking } from "react-native";

export default function FooterDonate() {
  return (
    <View style={styles.container}>
      <Pressable onPress={() => Linking.openURL("https://your-donate-link.com")}>
        <Text style={styles.text}>💖 Support Nova</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, alignItems: "center" },
  text: { color: "#cfe8ef", fontWeight: "700" },
});
