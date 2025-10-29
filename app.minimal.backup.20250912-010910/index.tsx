import { View, Text, Pressable } from "react-native";
import "react-native-reanimated";

export default function Home() {
  return (
    <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#0ff", fontSize: 24, marginBottom: 16 }}>Nova Minimal Boot</Text>
      <Text style={{ color: "#9cf" }}>If this renders, the bundler works ✅</Text>
    </View>
  );
}
