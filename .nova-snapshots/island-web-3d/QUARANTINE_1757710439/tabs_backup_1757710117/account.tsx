import React from "react";
import { View, Text, Pressable } from "react-native";
import { Link } from "expo-router";

export default function AccountTab() {
  return (
    <View style={{ flex:1, alignItems:"center", justifyContent:"center", padding:24 }}>
      <Text style={{ fontSize:22, fontWeight:"700", marginBottom:12 }}>Welcome</Text>
      <Text style={{ opacity:0.8, marginBottom:24, textAlign:"center" }}>
        Register, log in, or recover your password.
      </Text>
      <View style={{ gap:12, width:"100%", maxWidth:320 }}>
        <Link href="/(auth)/register" asChild>
          <Pressable style={{ padding:14, borderRadius:12, borderWidth:1 }}><Text>Register</Text></Pressable>
        </Link>
        <Link href="/(auth)/login" asChild>
          <Pressable style={{ padding:14, borderRadius:12, borderWidth:1 }}><Text>Login</Text></Pressable>
        </Link>
        <Link href="/(auth)/forgot" asChild>
          <Pressable style={{ padding:14, borderRadius:12, borderWidth:1 }}><Text>Forgot password?</Text></Pressable>
        </Link>
      </View>
    </View>
  );
}
