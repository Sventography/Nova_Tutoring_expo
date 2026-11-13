import { Pressable, Text } from "react-native";
export default function FloatingDonateButton({ onPress=()=>{} }:{onPress?:()=>void}) {
  return <Pressable onPress={onPress} style={{position:"absolute", right:16, bottom:16, padding:12, borderRadius:999, borderWidth:1}}>
    <Text>Donate</Text>
  </Pressable>;
}
