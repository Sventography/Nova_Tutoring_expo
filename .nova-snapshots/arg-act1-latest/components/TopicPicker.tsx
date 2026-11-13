// app/components/TopicPicker.tsx
import React from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView } from "react-native";
import { useTopics } from "../state/TopicsContext";

type Props = { label?: string; compact?: boolean };

export default function TopicPicker({ label = "Choose a topic", compact }: Props) {
  const { topics, selectedTopic, setSelectedTopic } = useTopics();
  const [open, setOpen] = React.useState(false);

  return (
    <View style={{ marginVertical: compact ? 8 : 12 }}>
      <Text style={{ color: "#8ef", marginBottom: 6, fontWeight: "600" }}>{label}</Text>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: "#0ff",
          borderRadius: 12,
          backgroundColor: "rgba(0,0,0,0.4)",
        }}
      >
        <Text style={{ color: "#e6ffff", fontSize: 16 }}>
          {selectedTopic ?? "Select a topic"}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 20 }}>
          <View style={{ maxHeight: "70%", backgroundColor: "#0a0f14", borderRadius: 16, borderWidth: 1, borderColor: "#0ff", padding: 10 }}>
            <Text style={{ color: "#8ef", fontWeight: "700", fontSize: 16, marginBottom: 10 }}>Select Topic</Text>
            <ScrollView>
              {topics.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => { setSelectedTopic(t); setOpen(false); }}
                  style={{ paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: "rgba(0,255,255,0.15)" }}
                >
                  <Text style={{ color: t === selectedTopic ? "#0ff" : "#e6ffff", fontWeight: t === selectedTopic ? "700" : "500" }}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setOpen(false)}
              style={{ marginTop: 10, alignSelf: "flex-end", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderColor: "#0ff", borderWidth: 1 }}
            >
              <Text style={{ color: "#8ef", fontWeight: "600" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
