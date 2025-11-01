import { View, Text } from "react-native";
export default function Purchases() {
  return <View style={{ padding: 16 }}>
    <Text style={{ fontSize: 22, fontWeight: "700" }}>Purchases</Text>
    <Text style={{ marginTop: 8, color: "#9aa" }}>Your recent orders will appear here.</Text>
  </View>;
}
