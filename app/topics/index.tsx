import React from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";
import FooterDonate from "@/components/FooterDonate";

export default function Topics() {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.body}>
        <Text style={styles.title}>Topics</Text>
        {/* ...your list, etc... */}
        <Link href="/(tabs)/ask" asChild>
          <Pressable style={styles.btn}><Text style={styles.btnText}>Ask</Text></Pressable>
        </Link>
      </View>

      {/* Footer donate on every page you want it */}
      <FooterDonate onPress={() => { /* TODO: open donate flow */ }} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16 },
  title: { color: "#cfe8ef", fontWeight: "800", fontSize: 18, marginBottom: 12 },
  btn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#00e5ff",
    backgroundColor: "#03202a"
  },
  btnText: { color: "#a5f4f9", fontWeight: "800" }
});
