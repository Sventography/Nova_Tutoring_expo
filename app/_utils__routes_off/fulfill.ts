import { Alert } from "react-native";

export async function fulfillPurchase(
  sku: string,
  tx: string,
  opts: { shipping?: any; coinsApi?: { add: (n:number)=>Promise<void> }; themeCtx?: any } = {}
) {
  try {
    const base = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8787";
    const res = await fetch(`${base}/api/fulfill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku, tx, shipping: opts.shipping }),
    });

    const data = await res.json();
    if (!data?.ok) {
      Alert.alert("Purchase Error", data?.error || "Could not verify purchase.");
      return;
    }

    if (data.type === "coins") {
      // add ONCE
      const add = Number(data.coins) || 0;
      await opts.coinsApi?.add?.(add);
      Alert.alert("Coins Added", `You received ${add.toLocaleString()} coins!`);
    } else if (data.type === "ownable") {
      // example: auto-equip themes here if you pass themeCtx
      Alert.alert("Purchase Complete", "Item unlocked!");
    } else if (data.type === "tangible") {
      Alert.alert("Order Received", "We’ll ship your item soon 💌");
    }
  } catch (err) {
    console.error("fulfillPurchase error", err);
    Alert.alert("Error", "Could not reach servers.");
  }
}
