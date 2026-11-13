import { Platform } from "react-native";
import { NativeModulesProxy } from "expo-modules-core";

/*
  Nova Tutoring IAP helper
  Safe for Expo Go / web / builds without the native IAP module.
*/

let IAPModule: any = null;

function hasNativeIAPModule() {
  if (Platform.OS === "web") return false;

  try {
    return !!(NativeModulesProxy as any)?.ExpoInAppPurchases;
  } catch {
    return false;
  }
}

async function getIAPSafe() {
  if (IAPModule) return IAPModule;

  if (!hasNativeIAPModule()) {
    console.log("[IAP] Native ExpoInAppPurchases module not present");
    return null;
  }

  try {
    const mod = await import("expo-in-app-purchases");
    IAPModule = mod;
    return mod;
  } catch (e) {
    console.log("[IAP] expo-in-app-purchases unavailable in this build", e);
    return null;
  }
}

export const PRODUCT_IDS = [
  "coins_500",
  "coins_2000",
  "coins_5000",
  "theme_pack",
  "companion_unlock",
];

export async function isIAPAvailable() {
  const IAP = await getIAPSafe();
  return !!(
    IAP &&
    typeof IAP.connectAsync === "function" &&
    typeof IAP.getProductsAsync === "function" &&
    typeof IAP.purchaseItemAsync === "function" &&
    typeof IAP.finishTransactionAsync === "function"
  );
}

export async function connectIAP() {
  const IAP = await getIAPSafe();
  if (!IAP || typeof IAP.connectAsync !== "function") {
    console.log("[IAP] Not available in this runtime");
    return false;
  }

  try {
    await IAP.connectAsync();
    console.log("[IAP] Connected");
    return true;
  } catch (e) {
    console.log("[IAP] Connection error", e);
    return false;
  }
}

export async function disconnectIAP() {
  try {
    const IAP = await getIAPSafe();
    await IAP?.disconnectAsync?.();
  } catch (e) {
    console.log("[IAP] Disconnect error", e);
  }
}

export async function getProducts() {
  const IAP = await getIAPSafe();
  if (!IAP || typeof IAP.getProductsAsync !== "function") {
    console.log("[IAP] Product fetch unavailable in this runtime");
    return [];
  }

  try {
    const { responseCode, results } = await IAP.getProductsAsync(PRODUCT_IDS);

    if (responseCode === IAP.IAPResponseCode?.OK) {
      return results ?? [];
    }

    return [];
  } catch (e) {
    console.log("[IAP] Product fetch error", e);
    return [];
  }
}

export async function purchaseProduct(productId: string) {
  const IAP = await getIAPSafe();
  if (!IAP || typeof IAP.purchaseItemAsync !== "function") {
    console.log("[IAP] Purchase unavailable in this runtime");
    return false;
  }

  try {
    await IAP.purchaseItemAsync(productId);
    return true;
  } catch (e) {
    console.log("[IAP] Purchase error", e);
    return false;
  }
}

export async function listenForPurchases({
  addCoins,
  unlockTheme,
  unlockCompanion,
}: any) {
  const IAP = await getIAPSafe();
  if (!IAP || typeof IAP.setPurchaseListener !== "function") {
    console.log("[IAP] Purchase listener unavailable in this runtime");
    return null;
  }

  try {
    const sub = IAP.setPurchaseListener(async ({ responseCode, results }: any) => {
      if (responseCode !== IAP.IAPResponseCode?.OK) return;
      if (!Array.isArray(results)) return;

      for (const purchase of results) {
        try {
          if (purchase?.acknowledged) continue;

          switch (purchase?.productId) {
            case "coins_500":
              addCoins?.(500);
              break;
            case "coins_2000":
              addCoins?.(2000);
              break;
            case "coins_5000":
              addCoins?.(5000);
              break;
            case "theme_pack":
              unlockTheme?.();
              break;
            case "companion_unlock":
              unlockCompanion?.();
              break;
          }

          await IAP.finishTransactionAsync?.(purchase, false);
        } catch (e) {
          console.log("[IAP] Listener purchase handling error", e);
        }
      }
    });

    return sub;
  } catch (e) {
    console.log("[IAP] Listener setup error", e);
    return null;
  }
}