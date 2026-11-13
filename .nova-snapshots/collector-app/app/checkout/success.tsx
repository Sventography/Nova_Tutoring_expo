// app/success.tsx (or wherever this route lives)
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { usePurchases } from "../context/PurchasesContext";

const COINS_KEY = "@nova/coins";

// Prefer the Expo public backend URL (Render), fall back to localhost for dev
const API_BASE =
  process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8787";

type Status = "working" | "done" | "error";

export default function SuccessPage() {
  const params = useLocalSearchParams<{
    sku?: string | string[];
    tx?: string | string[];
  }>();

  const router = useRouter();
  const { grant } = usePurchases(); // ✅ hook into PurchasesContext

  const [status, setStatus] = useState<Status>("working");
  const [message, setMessage] = useState("Finalizing your purchase…");

  // Normalize params: use first value if they come in as arrays
  const rawSku =
    typeof params.sku === "string"
      ? params.sku
      : Array.isArray(params.sku)
      ? params.sku[0] ?? ""
      : "";

  const rawTx =
    typeof params.tx === "string"
      ? params.tx
      : Array.isArray(params.tx)
      ? params.tx[0] ?? ""
      : "";

  useEffect(() => {
    (async () => {
      try {
        if (!rawSku) {
          throw new Error("Missing SKU from checkout redirect.");
        }

        // Tiny hint to backend: if the sku clearly looks like a coin pack,
        // we mark it as such. Backend will still try to infer if this is missing.
        const isCoinPack = rawSku.toLowerCase().includes("coin");
        const payload: any = { sku: rawSku, tx: rawTx };
        if (isCoinPack) {
          payload.type = "coins";
        }

        const resp = await fetch(`${API_BASE}/api/fulfill`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        let data: any;
        try {
          data = await resp.json();
        } catch {
          throw new Error("Bad response from server.");
        }

        if (!resp.ok || !data?.ok) {
          throw new Error(data?.error || "Fulfillment failed.");
        }

        if (data.type === "coins") {
          // Figure out how many coins to add, robustly
          const awarded =
            typeof data.coins === "number"
              ? data.coins
              : parseInt(String(data.coins ?? "0"), 10) || 0;

          // Local coin bump for immediate feedback; backend/Supabase should also adjust coins
          const currentRaw = (await AsyncStorage.getItem(COINS_KEY)) ?? "0";
          const current = parseInt(currentRaw, 10) || 0;
          const next = current + awarded;

          await AsyncStorage.setItem(COINS_KEY, String(next));

          setMessage(
            `Added ${awarded.toLocaleString()} coins ✨ (you now have ${next.toLocaleString()})`
          );
        } else if (data.type === "ownable") {
          // ✅ Mark digital items as owned via PurchasesContext
          await grant(rawSku);
          setMessage(`Unlocked: ${rawSku}`);
        } else if (data.type === "tangible") {
          // If you ever decide to distinguish this on the backend, it's already handled.
          await grant(rawSku);
          setMessage("Order received! Shipping details will be emailed to you.");
        } else {
          setMessage("Purchase completed.");
        }

        setStatus("done");

        // ✅ Route back into the tabs group Shop screen
        setTimeout(() => {
          router.replace("/(tabs)/shop");
        }, 1000);
      } catch (e: any) {
        console.log("[success] error finalizing purchase:", e);
        setStatus("error");
        setMessage(
          e?.message || "Something went wrong while finalizing your purchase."
        );
      }
    })();
  }, [rawSku, rawTx, router, grant]);

  const isError = status === "error";

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        backgroundColor: "#020713",
      }}
    >
      {status === "working" && <ActivityIndicator />}
      <Text
        style={{
          color: isError ? "#ffb3b3" : "#cfeaf0",
          fontSize: 18,
          marginTop: 12,
          textAlign: "center",
        }}
      >
        {message}
      </Text>
    </View>
  );
}
