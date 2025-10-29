import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../context/AuthContext";

export default function ForgotPassword() {
  const { requestReset } = useAuth();
  const [email, setEmail] = useState("");

  async function sendToken() {
    try {
      if (!email.trim()) throw new Error("Enter your email");
      const token = await requestReset(email.trim());

      // Web: no native mail app, just show the token (or copy to clipboard if you want)
      if (Platform.OS === "web") {
        Alert.alert("Reset Token", `Use this token: ${token}\n(It expires in 15 minutes.)`);
        return;
      }

      // Native: lazy-load the module so Web bundler doesn't try to resolve it
      const MailComposer = await import("expo-mail-composer");
      const available = await MailComposer.isAvailableAsync();
      if (available) {
        await MailComposer.composeAsync({
          recipients: [email.trim()],
          subject: "Nova Tutoring Password Reset",
          body: `Your reset token is: ${token}\n\nIt expires in 15 minutes.`,
        });
        Alert.alert("Sent", "A reset token was sent to your email.");
      } else {
        Alert.alert("Mail not available", `Use this token: ${token}`);
      }
    } catch (e:any) {
      Alert.alert("Error", e?.message || "Could not send token");
    }
  }

  return (
    <LinearGradient colors={["#000000","#0d1b2a"]} style={{flex:1}}>
      <View style={S.wrap}>
        <Text style={S.title}>Forgot Password</Text>
        <TextInput
          style={S.input}
          placeholder="Enter your account email"
          placeholderTextColor="#8aa0ad"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TouchableOpacity style={[S.btn,{backgroundColor:"#00e5ff"}]} activeOpacity={0.86} onPress={sendToken}>
          <Text style={S.btnTxt}>Send Reset Token</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

export const S = StyleSheet.create({
  wrap:{flex:1,padding:16,justifyContent:"center"},
  title:{fontSize:22,fontWeight:"800",color:"#e6f7ff",marginBottom:12,textAlign:"center"},
  input:{borderWidth:2,borderColor:"#00e5ff",borderRadius:12,paddingHorizontal:12,paddingVertical:10,marginBottom:12,color:"#e6f7ff",backgroundColor:"rgba(255,255,255,0.02)"},
  btn:{paddingVertical:12,borderRadius:999,alignItems:"center",justifyContent:"center"},
  btnTxt:{color:"#001018",fontWeight:"800",letterSpacing:0.3}
});
