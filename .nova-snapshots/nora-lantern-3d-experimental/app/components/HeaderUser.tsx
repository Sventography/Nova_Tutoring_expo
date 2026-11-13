import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function HeaderUser() {
  const { user } = useAuth();
  if (!user) return <Text style={{ color: "#fff" }}>Guest</Text>;
  return (
    <View style={styles.container}>
      {user.avatar ? (
        <Image source={{ uri: user.avatar }} style={styles.avatar} />
      ) : (
        <Image source={require("../assets/shop/nova_bunny_front.png")} style={styles.avatar} />
      )}
      <Text style={styles.username}>{user.username || "User"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 28, height: 28, borderRadius: 14, marginRight: 6 },
  username: { color: "#fff", fontWeight: "700" },
});
