import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const COINS_KEY = "@nova/coins";
const PURCHASES_KEY = "@nova/purchases";
const API_BASE = "http://127.0.0.1:8787"; // match your backend port

export default function SuccessPage() {
  const { sku = "", tx = "" } = useLocalSearchParams<{ sku?: string; tx?: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<"working"|"done"|"error">("working");
  const [message, setMessage] = useState("Finalizing your purchase…");

  useEffect(() => {
    (async () => {
      try {
        if (!sku) throw new Error("Missing SKU");

        const resp = await fetch(`${API_BASE}/api/fulfill`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sku, tx }),
        });
        const data = await resp.json();
        if (!data.ok) throw new Error(data.error || "Fulfillment failed");

        if (data.type === "coins") {
          const cur = parseInt((await AsyncStorage.getItem(COINS_KEY)) || "0", 10);
          await AsyncStorage.setItem(COINS_KEY, String(cur + (data.coins || 0)));
          setMessage(`Added ${data.coins?.toLocaleString()} coins ✨`);
        } else if (data.type === "ownable") {
          const raw = (await AsyncStorage.getItem(PURCHASES_KEY)) || "{}";
          const purchases = JSON.parse(raw);
          purchases[sku] = true;
          await AsyncStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases));
          setMessage(`Unlocked: ${sku}`);
        } else if (data.type === "tangible") {
          setMessage("Order received! Shipping details emailed.");
        } else {
          setMessage("Purchase completed.");
        }

        setStatus("done");
        setTimeout(() => router.replace("/shop"), 1000);
      } catch (e:any) {
        setStatus("error");
        setMessage(e.message || "Something went wrong");
      }
    })();
  }, [sku, tx, router]);

  return (
    <View style={{flex:1,alignItems:"center",justifyContent:"center"}}>
      {status==="working" && <ActivityIndicator />}
      <Text style={{color:"#cfeaf0",fontSize:18,marginTop:12}}>{message}</Text>
    </View>
  );
}
