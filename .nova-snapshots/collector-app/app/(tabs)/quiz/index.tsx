import React from "react";
import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { getTopics } from "../../_lib/flashcards";

const CYAN = "#00E5FF";
const BLUE = "#0B2239";
const BLACK = "#000";

export default function QuizTopics() {
  const router = useRouter();
  const topics = getTopics(); // [{id,title,count}]

  return (
    <LinearGradient colors={[BLACK, BLUE]} style={{flex:1}}>
      <View style={S.wrap}>
        <Text style={S.title}>Choose a Topic</Text>
        <FlatList
          data={topics}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <Pressable
              style={S.item}
              onPress={() =>
                router.push({ pathname: "/quiz/[topic]", params: { id: item.id, title: item.title } })
              }
            >
              <Text style={S.itemTitle}>{item.title}</Text>
              <Text style={S.itemMeta}>{item.count} cards</Text>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={{height:10}} />}
          ListEmptyComponent={<Text style={S.itemMeta}>No topics found.</Text>}
        />
      </View>
    </LinearGradient>
  );
}

export const S = StyleSheet.create({
  wrap: { flex:1, padding:16 },
  title: { fontSize:22, fontWeight:"800", color:CYAN, marginBottom:12 },
  item: { padding:14, borderRadius:10, borderWidth:1.5, borderColor:CYAN, backgroundColor:"rgba(0,229,255,0.08)" },
  itemTitle: { color:CYAN, fontSize:16, fontWeight:"700" },
  itemMeta: { color:CYAN, opacity:0.85, marginTop:4 }
});
