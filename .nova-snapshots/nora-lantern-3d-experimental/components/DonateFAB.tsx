import React from "react";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function DonateFab({ onPress }: { onPress?: () => void }) {
  return (
    <View style={{ position:"absolute", right:16, bottom:82 }}>
      <Pressable onPress={onPress}>
        <LinearGradient colors={["#000000", "#00e5ff"]} start={{x:0,y:0}} end={{x:1,y:1}}
          style={{ paddingVertical:12, paddingHorizontal:16, borderRadius:999, flexDirection:"row", alignItems:"center", gap:8 }}>
          <Ionicons name="heart-outline" color="#001014" size={18} />
          <Text style={{ color:"#001014", fontWeight:"900" }}>Donate</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}
