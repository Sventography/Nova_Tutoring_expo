import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTheme } from "../context/ThemeContext";

const btn = (onPress:()=>void, label:string, tint:string) => (
  <Pressable onPress={onPress} style={{ paddingHorizontal:12, paddingVertical:8, borderRadius:8, borderWidth:1, borderColor:tint, marginRight:8 }}>
    <Text style={{ color: tint }}>{label}</Text>
  </Pressable>
);

export default function DevThemeSwitcher() {
  const { setThemeById, tokens, themeId } = useTheme();
  return (
    <View style={{ flexDirection:"row", alignItems:"center", padding:8, margin:8, borderRadius:10, borderWidth:1, borderColor:tokens.border, backgroundColor:tokens.card }}>
      <Text style={{ color: tokens.subtext, marginRight:8 }}>Theme: {themeId}</Text>
      {btn(()=>setThemeById("theme:neon"), "Neon", tokens.tint)}
      {btn(()=>setThemeById("theme:starry"), "Starry", tokens.tint)}
      {btn(()=>setThemeById("theme:blackgold"), "Black&Gold", tokens.tint)}
    </View>
  );
}
