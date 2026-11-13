import { Pressable, Text } from "react-native";
export default function BackBtn({ onPress=()=>{} }:{onPress?:()=>void}) {
  return <Pressable onPress={onPress} style={{padding:8}}><Text>← Back</Text></Pressable>;
}
