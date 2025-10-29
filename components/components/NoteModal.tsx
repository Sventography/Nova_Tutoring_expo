// app/components/NoteModal.tsx
import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { getNote, setNote } from "@lib/bookmarks";

type Props = {
  visible: boolean;
  onClose: () => void;
  itemKey: string; // `${topicId}:${qIndex}`
};

export default function NoteModal({ visible, onClose, itemKey }: Props) {
  const [text, setText] = useState("");

  useEffect(() => {
    (async () => {
      if (visible) {
        const t = await getNote(itemKey);
        setText(t);
      }
    })();
  }, [visible, itemKey]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.wrap}>
        <View style={s.card}>
          <Text style={s.title}>Your Note</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type something helpful to remember..."
            placeholderTextColor="#6b7bb0"
            multiline
            style={s.input}
          />
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Pressable
              style={[
                s.btn,
                { backgroundColor: "#142357", borderColor: "#2a3a78" },
              ]}
              onPress={async () => {
                await setNote(itemKey, text.trim());
                onClose();
              }}
            >
              <Text style={s.btnTxt}>Save</Text>
            </Pressable>
            <Pressable
              style={[
                s.btn,
                { backgroundColor: "#3a1022", borderColor: "#6a1a38" },
              ]}
              onPress={onClose}
            >
              <Text style={s.btnTxt}>Cancel</Text>
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
    justifyContent: "center",
    padding: 16,
  },
  card: {
    backgroundColor: "#0b0f1c",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#24305e",
  },
  title: {
    color: "#bfe1ff",
    fontWeight: "900",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 8,
  },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#24305e",
    borderRadius: 12,
    padding: 10,
    color: "#e6f0ff",
    backgroundColor: "#0c132a",
    textAlignVertical: "top",
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  btnTxt: { color: "#e6f0ff", fontWeight: "800" },
});
