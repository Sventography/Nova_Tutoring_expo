import React, { useMemo } from "react";
import { View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { TOPIC_PACKS } from "../constants/flashcards";

export type TopicOption = { label: string; value: string };
export function getSortedTopics(): TopicOption[] {
  return TOPIC_PACKS.slice()
    .sort((a, b) => a.topic.localeCompare(b.topic))
    .map((p) => ({ label: p.topic, value: p.slug }));
}

export default function TopicPicker({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (slug: string) => void;
}) {
  const options = useMemo(getSortedTopics, []);
  return (
    <View
      variant="bg"
      style={{
        backgroundColor: "#0b0f12",
        borderColor: "#00e5ff",
        borderWidth: 1,
        borderRadius: 12,
        marginBottom: 12,
      }}
    >
      <Picker
        selectedValue={value}
        onValueChange={(v) => onChange(String(v))}
        dropdownIconColor="#00e5ff"
        style={{ color: "#cfeaff" }}
      >
        {options.map((opt) => (
          <Picker.Item
            key={opt.value}
            label={opt.label}
            value={opt.value}
            color="#cfeaff"
          />
        ))}
      </Picker>
    </View>
  );
}
