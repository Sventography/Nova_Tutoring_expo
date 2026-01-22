import * as Linking from "expo-linking";
export async function buyWithUSD(sku: string) {
  const base = process.env.EXPO_PUBLIC_BACKEND_URL;
  const url = `${base}/checkout/start?sku=${encodeURIComponent(sku)}`;
  return Linking.openURL(url);
}
