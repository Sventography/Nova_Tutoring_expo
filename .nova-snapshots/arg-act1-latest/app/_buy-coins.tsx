import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { isIAPAvailable, getProducts, buyProduct } from "./_lib/payments";
import { IAP_PRODUCT_IDS } from "./constants/payments";

type Product = { productId: string; title: string; price?: string };

export default function BuyCoins() {
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  const fallback: Product[] = useMemo(
    () =>
      IAP_PRODUCT_IDS.map((id, i) => ({
        productId: id,
        title:
          ["Small Pack", "Medium Pack", "Large Pack", "Mega Pack"][i] ||
          "Coin Pack",
      })),
    [],
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const can = isIAPAvailable();
      if (!mounted) return;
      setAvailable(can);
      if (can) {
        try {
          const res = await getProducts();
          const mapped: Product[] =
            res?.map((p: any) => ({
              productId: p.productId ?? p.identifier ?? "",
              title: p.title ?? "Coin Pack",
              price: p.price ?? undefined,
            })) ?? [];
          if (mounted) setProducts(mapped.length ? mapped : fallback);
        } catch {
          if (mounted) setProducts(fallback);
        }
      } else {
        setProducts(fallback);
      }
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [fallback]);

  const onBuy = async (id: string) => {
    try {
      await buyProduct(id);
    } catch {}
  };

  if (loading) {
    return (
      <View variant="bg" style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.sub}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Buy Coins</Text>
      <Text style={styles.sub}>
        {available ? "In-App Purchases enabled" : "Using web checkout"}
      </Text>
      <FlatList
        data={products}
        keyExtractor={(item) => item.productId}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onBuy(item.productId)}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.price}>{item.price ?? "Tap to purchase"}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  h1: { fontSize: 24, fontWeight: "700" },
  sub: { opacity: 0.7, marginBottom: 10 },
  list: { gap: 12, paddingVertical: 8 },
  card: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  title: { fontSize: 18, fontWeight: "600" },
  price: { marginTop: 6, opacity: 0.8 },
});
