import React, { useMemo } from "react";
import {
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from "react-native";
import { getAllTopics } from "../constants/cards";

type Props = { selectedId?: string; onSelect: (id?: string) => void };

export default function TopicBar({ selectedId, onSelect }: Props) {
  const topics = useMemo(() => getAllTopics(), []);
  const data = useMemo(
    () => [{ id: "__all__", name: "All" }, ...topics],
    [topics],
  );

  return (
    <View variant="bg" style={s.wrap}>
      <FlatList
        data={data}
        keyExtractor={(t: any) => t.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.row}
        renderItem={({ item }: any) => {
          const active =
            (item.id === "__all__" && !selectedId) || item.id === selectedId;
          return (
            <TouchableOpacity
              onPress={() =>
                onSelect(item.id === "__all__" ? undefined : item.id)
              }
              style={[s.chip, active && s.active]}
            >
              <Text numberOfLines={1} style={[s.txt, active && s.activeTxt]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
        getItemLayout={(_, index) => ({
          length: 44,
          offset: 44 * index,
          index,
        })}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingTop: 8 },
  row: { paddingHorizontal: 12 },
  chip: {
    height: 36, // fixed height → no tall/stretch
    paddingHorizontal: 14,
    marginRight: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1e2a38",
    backgroundColor: "#0b121b",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  txt: { color: "#e6f1ff", fontSize: 14, fontWeight: "600", maxWidth: 160 },
  active: { borderColor: "#00e5ff", backgroundColor: "#0b1629" },
  activeTxt: { color: "#c7ecff" },
});
