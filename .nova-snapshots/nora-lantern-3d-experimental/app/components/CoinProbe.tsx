// import React from "react";
// import { View, Pressable, Text } from "react-native";
// import { useCoins } from "../context/CoinsContext";

// export default function CoinProbe() {
//   const { coins, add, spend } = useCoins();
//   return (
//     <View style={{ position:"absolute", right:10, bottom:10, gap:8 }}>
//       <Pressable onPress={()=>add(100)} style={{ padding:10, borderRadius:8, backgroundColor:"#0b2030", borderWidth:1, borderColor:"#00e5ff" }}>
//         <Text style={{ color:"#cfeaf0", fontWeight:"800" }}>+100 (now {coins})</Text>
//       </Pressable>
//       <Pressable onPress={()=>spend(50)} style={{ padding:10, borderRadius:8, backgroundColor:"#30100b", borderWidth:1, borderColor:"#ff6b6b" }}>
//         <Text style={{ color:"#ffdada", fontWeight:"800" }}>-50 (now {coins})</Text>
//       </Pressable>
//     </View>
//   );
// }
