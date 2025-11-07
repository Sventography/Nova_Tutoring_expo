import React, { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, View, Text } from "react-native";
import { getPurchases, PurchaseEntry } from "../storage/purchases";

function Row({ p }: { p: PurchaseEntry }) {
  const d = new Date(p.createdAt);
  const when = `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  const amount =
    p.source === "coins"
      ? `${p.amount.toLocaleString()} coins`
      : `$${(p.amount / 100).toFixed(2)}`;
  return (
    <View
      style={{
        padding: 12,
        borderRadius: 12,
        backgroundColor: "#0b1220",
        borderWidth: 1,
        borderColor: "rgba(0,229,255,0.2)",
        marginBottom: 10,
      }}
    >
      <Text style={{ color: "white", fontWeight: "700" }}>{p.title}</Text>
      <Text style={{ color: "#9ca3af" }}>{when}</Text>
      <Text style={{ color: "#cbd5e1", marginTop: 4 }}>Source: {p.source}</Text>
      <Text style={{ color: "#cbd5e1" }}>Amount: {amount}</Text>
      {p.meta?.fullName ? (
        <Text style={{ color: "#cbd5e1" }}>Name: {p.meta.fullName}</Text>
      ) : null}
      {p.meta?.email ? (
        <Text style={{ color: "#cbd5e1" }}>Email: {p.meta.email}</Text>
      ) : null}
      {p.meta?.addr1 ? (
        <Text style={{ color: "#cbd5e1" }}>
          Ship to: {p.meta.addr1}
          {p.meta.addr2 ? `, ${p.meta.addr2}` : ""}, {p.meta.city},{" "}
          {p.meta.state} {p.meta.zip}
        </Text>
      ) : null}
      {p.meta?.serverOrderId ? (
        <Text style={{ color: "#93c5fd" }}>
          Server Order: {p.meta.serverOrderId}
        </Text>
      ) : null}
    </View>
  );
}

export default function PurchasesScreen() {
  const [items, setItems] = useState<PurchaseEntry[]>([]);

  useEffect(() => {
    (async () => {
      const list = await getPurchases();
      setItems(list);
    })();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "black" }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text
          style={{
            color: "white",
            fontSize: 22,
            fontWeight: "800",
            marginBottom: 12,
          }}
        >
          Purchases
        </Text>
        {items.length === 0 ? (
          <Text style={{ color: "#9ca3af" }}>No purchases yet.</Text>
        ) : (
          items.map((p) => <Row key={p.id} p={p} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
