import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";

type Props = { amount: number; label: string };

export default function PayButton({ amount, label }: Props) {
  const handlePress = () => console.log(`Native pay: $${amount/100}`);
  return (
    <Pressable style={styles.button} onPress={handlePress}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button:{backgroundColor:"#00e5ff",paddingVertical:12,paddingHorizontal:24,borderRadius:8},
  text:{color:"#06121a",fontWeight:"bold"}
});
