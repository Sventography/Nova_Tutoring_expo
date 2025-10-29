import React, { useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable } from "react-native";
import { useThemeColors } from "./providers/ThemeBridge";

export default function Create() {
  const palette = useThemeColors();
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");

  const s = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.bg, padding: 16 },
    title: { color: "#fff", fontSize: 20, fontWeight: "800" },
    topic: { color: "#67e8f9", marginBottom: 4 },
    box: { backgroundColor: palette.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: palette.border },
    label: { color: "#a7f3d0", marginBottom: 6, fontWeight: "700" },
    input: { color: "#fff", minHeight: 80, fontSize: 16 },
    row: { flexDirection: "row", gap: 12, marginTop: 6 },
    btn: { backgroundColor: palette.primary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
    btnTxt: { color: "#001018", fontWeight: "700" }
  }), [palette]);

  return (
    <ScrollView style={s.screen} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Create</Text>
      <Text style={s.topic}>New Item</Text>
      <View style={s.box}>
        <Text style={s.label}>Topic</Text>
        <TextInput value={topic} onChangeText={setTopic} style={s.input} placeholder="Title" placeholderTextColor={palette.muted} />
      </View>
      <View style={[s.box, { marginTop: 12 }]}>
        <Text style={s.label}>Content</Text>
        <TextInput value={content} onChangeText={setContent} style={s.input} placeholder="Details" placeholderTextColor={palette.muted} multiline />
      </View>
      <View style={s.row}>
        <Pressable style={s.btn}>
          <Text style={s.btnTxt}>Save</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
