import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useCollections } from "../state/CollectionsContext";
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
export default function CustomCardBuilder({
  defaultTopic,
}: {
  defaultTopic: string;
}) {
  const { add } = useCollections();
  const [topic, setTopic] = useState(defaultTopic || "My Cards");
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const canSave = q.trim().length > 0 && a.trim().length > 0;
  const save = () => {
    if (!canSave) return;
    add({
      id: "user_" + uid(),
      topic: topic.trim() || "My Cards",
      question: q.trim(),
      answer: a.trim(),
      userCreated: true,
      createdAt: Date.now(),
    });
    setQ("");
    setA("");
  };
  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <View
        style={{ padding: 16, borderRadius: 16, backgroundColor: "#111827" }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 18,
            fontWeight: "700",
            marginBottom: 8,
          }}
        >
          Create Your Own Card
        </Text>
        <Text style={{ color: "white", opacity: 0.8, marginBottom: 4 }}>
          Topic
        </Text>
        <TextInput
          value={topic}
          onChangeText={setTopic}
          placeholder="Topic"
          placeholderTextColor="#9CA3AF"
          style={{
            backgroundColor: "#1F2937",
            color: "white",
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
          }}
        />
        <Text style={{ color: "white", opacity: 0.8, marginBottom: 4 }}>
          Front
        </Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Question / prompt"
          placeholderTextColor="#9CA3AF"
          multiline
          style={{
            backgroundColor: "#1F2937",
            color: "white",
            borderRadius: 12,
            padding: 12,
            minHeight: 60,
            marginBottom: 12,
          }}
        />
        <Text style={{ color: "white", opacity: 0.8, marginBottom: 4 }}>
          Back
        </Text>
        <TextInput
          value={a}
          onChangeText={setA}
          placeholder="Answer"
          placeholderTextColor="#9CA3AF"
          multiline
          style={{
            backgroundColor: "#1F2937",
            color: "white",
            borderRadius: 12,
            padding: 12,
            minHeight: 60,
            marginBottom: 16,
          }}
        />
        <Pressable
          disabled={!canSave}
          onPress={save}
          style={{
            backgroundColor: canSave ? "#10B981" : "#6B7280",
            padding: 14,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>
            Save To Collection
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
