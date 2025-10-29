import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";

export type AddressPayload = {
  name: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
};

export default function AddressSheet({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (addr: AddressPayload) => void | Promise<void>;
}) {
  const [form, setForm] = useState<AddressPayload>({
    name: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    country: "",
  });

  const upd = (k: keyof AddressPayload, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const canSubmit =
    form.name.trim() &&
    form.email.trim() &&
    form.phone.trim() &&
    form.address1.trim() &&
    form.city.trim() &&
    form.state.trim() &&
    form.zip.trim();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "#071018" }}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Shipping details</Text>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Field label="Full name" value={form.name} onChangeText={(t) => upd("name", t)} />
          <Field label="Email" value={form.email} keyboardType="email-address" onChangeText={(t) => upd("email", t)} />
          <Field label="Phone" value={form.phone} keyboardType="phone-pad" onChangeText={(t) => upd("phone", t)} />
          <Field label="Address line 1" value={form.address1} onChangeText={(t) => upd("address1", t)} />
          <Field label="Address line 2" value={form.address2 ?? ""} onChangeText={(t) => upd("address2", t)} />
          <Field label="City" value={form.city ?? ""} onChangeText={(t) => upd("city", t)} />
          <Field label="State/Province" value={form.state ?? ""} onChangeText={(t) => upd("state", t)} />
          <Field label="Postal / ZIP" value={form.zip ?? ""} onChangeText={(t) => upd("zip", t)} />
          <Field label="Country" value={form.country ?? ""} onChangeText={(t) => upd("country", t)} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onClose}>
            <Text style={styles.btnGhostText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, canSubmit ? styles.btnPrimary : styles.btnDisabled]}
            onPress={() => canSubmit && onConfirm(form)}
            disabled={!canSubmit}
          >
            <Text style={styles.btnText}>Continue to billing</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  ...rest
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#7aa8b0"
        style={styles.input}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 12, paddingHorizontal: 16 },
  title: { color: "#eaffff", fontSize: 22, fontWeight: "800" },
  body: { padding: 16 },
  label: { color: "#9fe6ff", marginBottom: 6, fontSize: 14, fontWeight: "600" },
  input: {
    backgroundColor: "rgba(0,229,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.35)",
    borderRadius: 10,
    color: "#eaffff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  footer: {
    padding: 16,
    gap: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,229,255,0.18)",
  },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  btnPrimary: { backgroundColor: "#00e5ff" },
  btnDisabled: { backgroundColor: "rgba(0,229,255,0.25)" },
  btnText: { color: "#00141a", fontWeight: "800", fontSize: 16 },
  btnGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  btnGhostText: { color: "#eaffff", fontWeight: "700", fontSize: 16 },
});
