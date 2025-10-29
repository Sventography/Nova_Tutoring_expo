import { View, Text } from "react-native";
export default function AchievementToast({ message }:{message:string}) {
  return <View style={{position:"absolute", top:50, alignSelf:"center", padding:12, borderWidth:1, borderRadius:12}}>
    <Text>{message}</Text>
  </View>;
}
