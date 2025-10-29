import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";

export default function GroundingForm() {
  const [five, setFive] = useState("");
  const [four, setFour] = useState("");
  const [three, setThree] = useState("");
  const [two, setTwo] = useState("");
  const [one, setOne] = useState("");

  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.title}>5–4–3–2–1 Grounding</Text>
      <Input label="5 things you can see" value={five} onChangeText={setFive} />
      <Input label="4 things you can feel" value={four} onChangeText={setFour} />
      <Input label="3 things you can hear" value={three} onChangeText={setThree} />
      <Input label="2 things you can smell" value={two} onChangeText={setTwo} />
      <Input label="1 thing you can taste" value={one} onChangeText={setOne} />
    </View>
  );
}

function Input({ label, ...props }: any) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholder="Type here…"
        placeholderTextColor="#999"
        style={styles.input}
        multiline
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "800", color: "#333", marginBottom: 2 },
  label: { color: "#444", fontWeight: "700" },
  input: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 10, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 12, paddingVertical: 10, minHeight: 44,
  },
});
