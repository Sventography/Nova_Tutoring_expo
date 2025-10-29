import React, { useMemo, useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getTopics, searchTopics, type TopicIndex } from "../data/flashcards/source";

/**
 * Auto-sized searchable topic menu:
 * - Caps its height so it never overlaps the bottom tab bar
 * - Fully scrollable list inside
 * - Works with keyboard (avoids overlap)
 * - Has a ❌ button (clears; if already empty, calls onClose)
 */
export default function EnhancedTopicPicker({
  onChange,
  onClose,
  placeholder = "Search topics…",
  autoFocus = false,
  maxItems = 60,
}: {
  onChange: (t: TopicIndex) => void;
  onClose?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  maxItems?: number;
}) {
  const insets = useSafeAreaInsets();
  const all = useMemo(() => getTopics(), []);
  const [q, setQ] = useState("");

  const results = q ? searchTopics(q, maxItems) : all.slice(0, maxItems);

  // dynamic height so the panel doesn't run under the tab bar
  const win = Dimensions.get("window");
  const headerApprox = 100; // our AppHeader block
  const searchBoxApprox = 56; // input height + margin
  const verticalMargins = 24;
  const tabBarApprox = 60;
  const available =
    win.height - (insets.top + headerApprox + searchBoxApprox + verticalMargins + tabBarApprox + insets.bottom);
  const maxPanelHeight = Math.max(220, Math.min(420, available));

  const onPressX = () => {
    if (q.trim().length > 0) {
      setQ("");
    } else {
      onClose?.();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      keyboardVerticalOffset={Platform.select({ ios: 10, android: 0 })}
    >
      <View style={s.panel}>
        <View style={s.inputWrap}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={placeholder}
            placeholderTextColor="#7aa8b0"
            style={s.input}
            autoFocus={autoFocus}
            returnKeyType="search"
          />
          <TouchableOpacity onPress={onPressX} style={s.clearBtn} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <Text style={s.clearTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={[s.listWrap, { maxHeight: maxPanelHeight }]}>
          <FlatList
            data={results}
            keyExtractor={(x) => x.id}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            contentContainerStyle={{ paddingBottom: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => onChange(item)} style={s.row}>
                <Text style={s.title} numberOfLines={1}>{item.title}</Text>
                <Text style={s.meta}>{item.group} · {item.count}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.30)",
    backgroundColor: "rgba(0,229,255,0.06)",
    borderRadius: 14,
    padding: 10,
  },
  inputWrap: { position: "relative" },
  input: {
    borderWidth: 1, borderColor: "rgba(0,229,255,0.35)",
    backgroundColor: "rgba(0,229,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    color: "#eaffff", fontWeight: "800",
    marginBottom: 8,
    paddingRight: 40
  },
  clearBtn: { position: "absolute", right: 10, top: 8, width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  clearTxt: { color: "#eaffff", fontWeight: "900", fontSize: 14, lineHeight: 14 },
  listWrap: { overflow: "hidden", borderRadius: 10 },
  row: {
    paddingVertical: 10, paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  title: { color: "#eaffff", fontWeight: "800" },
  meta: { color: "#7aa8b0", fontSize: 12, marginTop: 2 },
});
