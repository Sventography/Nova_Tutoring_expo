import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  FlatList,
} from "react-native";

const STEPS = [
  { n: 5, label: "things you can see" },
  { n: 4, label: "things you can feel" },
  { n: 3, label: "things you can hear" },
  { n: 2, label: "things you can smell" },
  { n: 1, label: "thing you can taste" },
];

export default function Grounding() {
  const [i, setI] = useState(0);
  const [inputs, setInputs] = useState<string[]>(Array(STEPS.length).fill(""));
  const [lists, setLists] = useState<string[][]>(
    Array(STEPS.length)
      .fill(null)
      .map(() => []),
  );
  const step = STEPS[i];
  const canNext = useMemo(() => lists[i].length >= step.n, [lists, i, step]);

  const addItem = () => {
    const v = inputs[i].trim();
    if (!v) return;
    if (lists[i].length >= step.n) return;
    const next = lists.map((arr, idx) => (idx === i ? [...arr, v] : arr));
    setLists(next);
    const ni = inputs.slice();
    ni[i] = "";
    setInputs(ni);
  };
  const removeItem = (idx: number) => {
    const next = lists.map((arr, si) =>
      si === i ? arr.filter((_, j) => j !== idx) : arr,
    );
    setLists(next);
  };

  return (
    <View variant="bg" style={s.wrap}>
      <Text style={s.h}>5–4–3–2–1 Grounding</Text>
      <Text style={s.t}>
        Name {step.n} {step.label}.
      </Text>
      <View style={s.inputRow}>
        <TextInput
          value={inputs[i]}
          onChangeText={(txt) => {
            const ni = inputs.slice();
            ni[i] = txt;
            setInputs(ni);
          }}
          placeholder="Type one item and tap Add"
          placeholderTextColor="#7f9bb8"
          style={s.input}
          onSubmitEditing={addItem}
          returnKeyType="done"
        />
        <Pressable
          style={[s.btn, lists[i].length >= step.n && s.btnDis]}
          onPress={addItem}
          disabled={lists[i].length >= step.n}
        >
          <Text style={s.btnT}>Add</Text>
        </Pressable>
      </View>
      <FlatList
        data={lists[i]}
        keyExtractor={(_, idx) => String(idx)}
        renderItem={({ item, index }) => (
          <View style={s.itemRow}>
            <Text style={s.itemT}>
              {index + 1}. {item}
            </Text>
            <Pressable style={s.remove} onPress={() => removeItem(index)}>
              <Text style={s.removeT}>×</Text>
            </Pressable>
          </View>
        )}
        ListFooterComponent={
          <Text style={s.progress}>
            {lists[i].length}/{step.n}
          </Text>
        }
      />
      <View style={s.row}>
        <Pressable
          style={[s.btn, !canNext && s.btnDis]}
          onPress={() => setI((v) => Math.min(v + 1, STEPS.length - 1))}
          disabled={!canNext}
        >
          <Text style={s.btnT}>{i < STEPS.length - 1 ? "Next" : "Done"}</Text>
        </Pressable>
        <Pressable
          style={s.btnAlt}
          onPress={() => {
            setI(0);
            setInputs(Array(STEPS.length).fill(""));
            setLists(
              Array(STEPS.length)
                .fill(null)
                .map(() => []),
            );
          }}
        >
          <Text style={s.btnT}>Restart</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 14, alignItems: "center" },
  h: { color: "#cfe6ff", fontSize: 18, fontWeight: "800", marginBottom: 6 },
  t: { color: "#9bbad6", fontSize: 14, marginBottom: 10, textAlign: "center" },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  input: {
    width: 240,
    borderWidth: 2,
    borderColor: "#0ff",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#cfe6ff",
    backgroundColor: "#111",
  },
  row: { flexDirection: "row", gap: 10, marginTop: 10 },
  btn: {
    borderWidth: 2,
    borderColor: "#0ff",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#111",
  },
  btnAlt: {
    borderWidth: 2,
    borderColor: "#0ff",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#111",
  },
  btnDis: { opacity: 0.5 },
  btnT: { color: "#0ff", fontWeight: "800" },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 2,
    borderColor: "#0ff",
    borderRadius: 10,
    backgroundColor: "#111",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
    width: 300,
  },
  itemT: { color: "#cfe6ff", fontSize: 14, flex: 1, marginRight: 10 },
  remove: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0ff",
  },
  removeT: { color: "#0ff", fontSize: 16, fontWeight: "900", lineHeight: 16 },
  progress: { color: "#7f9bb8", textAlign: "center", marginTop: 8 },
});
