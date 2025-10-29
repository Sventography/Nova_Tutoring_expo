// app/components/AddressSheet.tsx
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";

export type Address = {
  fullName: string;
  email: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
};

export default function AddressSheet({
  onCancel,
  onSubmit,
  initial,
}: {
  onCancel: () => void;
  onSubmit: (addr: Address) => void;
  initial?: Partial<Address>;
}) {
  const [fullName, setFullName] = useState(initial?.fullName || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [line1, setLine1] = useState(initial?.line1 || "");
  const [line2, setLine2] = useState(initial?.line2 || "");
  const [city, setCity] = useState(initial?.city || "");
  const [state, setState] = useState(initial?.state || "");
  const [postalCode, setPostalCode] = useState(initial?.postalCode || "");
  const [country, setCountry] = useState(initial?.country || "USA");
  const [phone, setPhone] = useState(initial?.phone || "");

  const submit = () => {
    if (!fullName || !email || !line1 || !city || !state || !postalCode || !country) return;
    onSubmit({ fullName, email, line1, line2, city, state, postalCode, country, phone });
  };

  const input = (value: string, setter: (s: string) => void, placeholder: string) => (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor="#66b9c6"
      value={value}
      onChangeText={setter}
      style={{
        color: "#e6fcff",
        borderColor: "#00e5ff",
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 8,
      }}
    />
  );

  return (
    <View style={{ backgroundColor: "#04101c", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#00e5ff", width: "100%" }}>
      <Text style={{ color: "#e6fcff", fontWeight: "800", fontSize: 18, marginBottom: 10 }}>Shipping details</Text>
      {input(fullName, setFullName, "Full name")}
      {input(email, setEmail, "Email")}
      {input(line1, setLine1, "Address line 1")}
      {input(line2 || "", setLine2, "Address line 2 (optional)")}
      {input(city, setCity, "City")}
      {input(state, setState, "State / Province")}
      {input(postalCode, setPostalCode, "ZIP / Postal code")}
      {input(country, setCountry, "Country")}
      {input(phone || "", setPhone, "Phone (optional)")}

      <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
        <TouchableOpacity onPress={onCancel} style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#00e5ff" }}>
          <Text style={{ color: "#baf8ff" }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={submit} style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#00e5ff", backgroundColor: "#00bcd4" }}>
          <Text style={{ color: "#00131a", fontWeight: "800" }}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

