import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from "react-native";

export type ReviewItem = {
  q: string;
  a?: string;
  mark: "c" | "w" | null;
  index: number; // original index within the topic (not the display order)
};

type Filter = "all" | "wrong" | "unanswered";

export default function ReviewModal({
  visible,
  onClose,
  onRetake,
  topicTitle,
  items,
}: {
  visible: boolean;
  onClose: () => void;
  onRetake: () => void;
  topicTitle: string;
  items: ReviewItem[];
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const data = useMemo(() => {
    if (filter === "wrong") return items.filter((i) => i.mark === "w");
    if (filter === "unanswered") return items.filter((i) => i.mark === null);
    return items;
  }, [items, filter]);

  const render = ({ item }: { item: ReviewItem }) => (
    <View style={s.card}>
      <View style={s.row}>
        <Text style={s.badge(item.mark)}>
          {item.mark === "c" ? "✓" : item.mark === "w" ? "✗" : "—"}
        </Text>
        <Text style={s.qIndex}>Q{item.index + 1}</Text>
      </View>
      <Text style={s.q}>{item.q}</Text>
      {item.a ? (
        <View style={s.ans}>
          <Text style={s.ansLabel}>Answer</Text>
          <Text style={s.ansText}>{item.a}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={s.wrap}>
        <View style={s.sheet}>
          <Text style={s.title}>Review • {topicTitle}</Text>

          <View style={s.filters}>
            {(
              [
                { k: "all", label: "All" },
                { k: "wrong", label: "Wrong" },
                { k: "unanswered", label: "Unanswered" },
              ] as { k: Filter; label: string }[]
            ).map((opt) => (
              <Pressable
                key={opt.k}
                onPress={() => setFilter(opt.k)}
                style={[s.pill, filter === opt.k && s.pillOn]}
              >
                <Text style={[s.pillText, filter === opt.k && s.pillTextOn]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <FlatList
            data={data}
            keyExtractor={(it, i) => `${it.index}-${i}`}
            renderItem={render}
            contentContainerStyle={{ paddingBottom: 16 }}
          />

          <View style={s.footerRow}>
            <Pressable style={[s.btn, s.retake]} onPress={onRetake}>
              <Text style={s.btnText}>Retake Quiz</Text>
            </Pressable>
            <Pressable style={[s.btn, s.close]} onPress={onClose}>
              <Text style={s.btnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#0b0f1c",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#24305e",
    maxHeight: "86%",
  },
  title: {
    color: "#cfe3ff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },

  filters: {
    flexDirection: "row",
    gap: 8,
    alignSelf: "center",
    marginBottom: 12,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2a3a78",
  },
  pillOn: { backgroundColor: "#142357" },
  pillText: { color: "#bcd1ff", fontWeight: "700" },
  pillTextOn: { color: "#e6f0ff" },

  card: {
    borderWidth: 1,
    borderColor: "#273c78",
    backgroundColor: "#0c142c",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  badge: (m: "c" | "w" | null) => ({
    color: m === "c" ? "#14c78a" : m === "w" ? "#ff6b81" : "#7aa2ff",
    borderColor: m === "c" ? "#14c78a" : m === "w" ? "#ff6b81" : "#7aa2ff",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontWeight: "800",
  }),
  qIndex: { color: "#93a8df", fontWeight: "800" },
  q: { color: "#e6f0ff", fontSize: 15, lineHeight: 22 },

  ans: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a3a78",
    backgroundColor: "#0b1026",
  },
  ansLabel: { color: "#9eb3ea", fontWeight: "700", marginBottom: 4 },
  ansText: { color: "#a9ffde", fontWeight: "700" },

  footerRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  btn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  btnText: { color: "#e6f0ff", fontWeight: "800" },
  retake: { borderColor: "#2a3a78", backgroundColor: "#142357" },
  close: { borderColor: "#4a1f66", backgroundColor: "#4a1f66" },
});
