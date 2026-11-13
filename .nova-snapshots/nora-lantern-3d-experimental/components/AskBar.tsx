import React, { useState } from "react";
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
type Props = { onSend?: (text: string) => Promise<void> | void; placeholder?: string };
export default function AskBar({ onSend, placeholder = "Ask anything…" }: Props) {
  const [text, setText] = useState(""); const [busy, setBusy] = useState(false); const insets = useSafeAreaInsets();
  const handleSend = async () => { if (!text.trim() || busy) return; try { setBusy(true); await onSend?.(text.trim()); setText(""); } finally { setBusy(false); } };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0} style={{ position:"absolute", left:0, right:0, bottom:0 }}>
      <View style={{ paddingBottom: Math.max(insets.bottom,12), paddingTop:12, paddingHorizontal:12, backgroundColor:"rgba(10,10,16,0.9)", borderTopWidth:1, borderColor:"#24243a" }}>
        <View style={{ flexDirection:"row", gap:8, backgroundColor:"#151522", borderRadius:14, borderWidth:1, borderColor:"#2a2a3a", alignItems:"center", padding:8 }}>
          <TextInput value={text} onChangeText={setText} placeholder={placeholder} placeholderTextColor="#7d7d92" multiline style={{ flex:1, color:"white", fontSize:16, maxHeight:120 }} />
          <Pressable onPress={handleSend} disabled={!text.trim() || busy} style={({pressed})=>({ backgroundColor: !text.trim() || busy ? "#2a2a3a" : pressed ? "#7c5cff" : "#8b74ff", paddingVertical:10, paddingHorizontal:16, borderRadius:10 })}>
            <Text style={{ color:"white", fontWeight:"700" }}>{busy ? "…" : "Send"}</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
