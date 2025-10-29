import React, { useState } from "react";
import { Pressable, Text, View, ActivityIndicator } from "react-native";
import * as Haptics from "expo-haptics";
import { addFlashcard, type SavedFlashcard } from "@lib/collections";

type Props = {
  topic: string;
  question: string;
  answer: string;
  id?: string;
  onSaved?: () => void;
};

export default function SaveFlashcardButton({
  topic,
  question,
  answer,
  id,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSave = async () => {
    if (saving || done) return;
    setSaving(true);
    const card: SavedFlashcard = {
      id: id ?? `${topic}:${question}`.slice(0, 120),
      topic,
      question,
      answer,
      addedAt: Date.now(),
    };
    try {
      await addFlashcard(card);
      setDone(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved?.();
      setTimeout(() => setDone(false), 1200);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Pressable
      onPress={handleSave}
      style={{
        backgroundColor: done ? "#7ef0c9" : "#7ee0ff",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {saving ? <ActivityIndicator /> : null}
        <Text style={{ color: "#001018", fontWeight: "800" }}>
          {done ? "Saved" : saving ? "Saving…" : "Save to Collection"}
        </Text>
      </View>
    </Pressable>
  );
}
