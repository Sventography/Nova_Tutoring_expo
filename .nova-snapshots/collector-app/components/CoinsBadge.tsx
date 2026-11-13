import { View, Text } from "react-native";
export default function CoinsBadge({ coins=0 }: { coins?: number }) {
  return <View style={{ padding:8, borderRadius:12, borderWidth:1 }}><Text>{coins} ��</Text></View>;
}
