import React from "react";
import { SafeAreaView, View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function Landing() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#020817" }}>
      <View style={{ flex: 1, padding: 24, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#67e8f9", fontSize: 34, fontWeight: "900", marginBottom: 8 }}>
          Nova Tutoring
        </Text>
        <Text style={{ color: "#baf8ff", fontSize: 16, textAlign: "center", marginBottom: 24 }}>
          Master all 112 topics with flashcards, timed quizzes, history & certificates.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/flashcards")}
          style={{ backgroundColor: "#00e5ff", borderColor: "#00e5ff", borderWidth: 1, paddingVertical: 14, paddingHorizontal: 22, borderRadius: 14 }}
        >
          <Text style={{ color: "#00131a", fontWeight: "900", fontSize: 16 }}>Start Learning</Text>
        </TouchableOpacity>
        <View style={{ height: 18 }} />
        <TouchableOpacity
          onPress={() => router.replace("/quiz")}
          style={{ backgroundColor: "transparent", borderColor: "#00e5ff", borderWidth: 1, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14 }}
        >
          <Text style={{ color: "#e6fcff", fontWeight: "800" }}>Jump to Quiz</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
