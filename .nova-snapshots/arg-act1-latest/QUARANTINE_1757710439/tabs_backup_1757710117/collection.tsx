import React from "react";
import { View, FlatList, Pressable, Text, Alert } from "react-native";
import { useCollection } from "../context/CollectionContext";
import {
  NeonScreen,
  SectionTitle,
  NeonCard,
  NeonText,
  NeonSub,
  NeonButton,
} from "@/components/ui";
import { useRouter } from "expo-router";
import { dedupeCollection, resetCollection } from "../_lib/storage";

export default function CollectionTab() {
  const { cards, remove, refresh, setAll } = useCollection();
  const router = useRouter();

  const confirmDelete = (id: string) => {
    Alert.alert(
      "Delete card?",
      "This will remove the card from your collection.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => remove(id) },
      ],
    );
  };

  const onDedupe = async () => {
    await dedupeCollection();
    await refresh();
  };

  const onReset = async () => {
    Alert.alert(
      "Reset all saved cards?",
      "This will erase your entire Collection.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Erase",
          style: "destructive",
          onPress: async () => {
            await resetCollection();
            await refresh();
          },
        },
      ],
    );
  };

  return (
    <NeonScreen>
      <SectionTitle>My Collection</SectionTitle>
      <NeonSub style={{ marginBottom: 10 }}>{cards.length} saved cards</NeonSub>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <NeonButton onPress={() => router.push("/custom-card/new")}>
            ＋ Create Custom Card
          </NeonButton>
        </View>
        <View style={{ flex: 1 }}>
          <NeonButton onPress={onDedupe}>Dedupe</NeonButton>
        </View>
        <View style={{ flex: 1 }}>
          <NeonButton onPress={onReset}>Reset</NeonButton>
        </View>
      </View>

      <FlatList
        data={cards}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ paddingBottom: 90 }}
        renderItem={({ item }) => (
          <NeonCard style={{ marginBottom: 10 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <View style={{ flex: 1 }}>
                <NeonText style={{ fontWeight: "800" }}>{item.front}</NeonText>
                <NeonSub numberOfLines={3}>{item.back}</NeonSub>
                {item.source?.type === "pack" && (
                  <Text
                    style={{ color: "#79dfff", fontSize: 12, marginTop: 6 }}
                  >
                    From: {item.source.slug} #{(item.source.index ?? 0) + 1}
                  </Text>
                )}
              </View>
              <Pressable
                accessibilityLabel="Delete card"
                onPress={() => confirmDelete(item.id)}
                style={{
                  alignSelf: "flex-start",
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: "#00e5ff",
                  borderRadius: 10,
                  backgroundColor: "#0b0f12",
                }}
              >
                <Text style={{ color: "#ff7d7d", fontSize: 16 }}>
                  🗑️ Delete
                </Text>
              </Pressable>
            </View>
          </NeonCard>
        )}
      />
    </NeonScreen>
  );
}
