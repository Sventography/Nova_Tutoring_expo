// app/utils/coin-order.ts
import Constants from "expo-constants";

const BACKEND_URL:
  | string
  | undefined =
  (process.env.EXPO_PUBLIC_BACKEND_URL as string | undefined) ||
  ((Constants.expoConfig?.extra as any)?.backendUrl as string | undefined) ||
  "http://127.0.0.1:8787";

export type CoinOrderUser = {
  id?: string;
  displayName?: string;
  username?: string;
  contactEmail?: string | null;
  email?: string | null;
};

export type CoinOrderItem = {
  id?: string;
  sku?: string;
  title?: string;
  category?: string;
  size?: string | null;
  quantity?: number;
};

export async function notifyCoinOrder(args: {
  coins: number;
  user?: CoinOrderUser | null;
  item?: CoinOrderItem | null;
  sessionId?: string | null;
}) {
  const { coins, user, item, sessionId } = args;

  if (!coins || coins <= 0) {
    console.warn("[coin-order] skip notify, invalid coins:", coins);
    return;
  }

  if (!BACKEND_URL) {
    console.warn("[coin-order] no BACKEND_URL configured");
    return;
  }

  const payload: any = {
    coins,
    sessionId: sessionId ?? null,
  };

  if (user) {
    payload.user = {
      id: user.id,
      displayName: user.displayName,
      username: user.username,
      contactEmail: user.contactEmail ?? null,
      email: user.email ?? null,
    };
  }

  if (item) {
    payload.item = {
      id: item.id,
      sku: item.sku ?? item.id,
      title: item.title,
      category: item.category,
      size: item.size ?? null,
      quantity: item.quantity ?? 1,
    };
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/coin-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    let json: any = null;
    try {
      json = await res.json();
    } catch {
      // ignore JSON parsing error, we'll still log status/text
    }

    if (!res.ok || !json?.ok) {
      const bodyText =
        json ||
        (await res
          .text()
          .catch(() => "[coin-order] failed to read response text"));
      console.warn(
        "[coin-order] backend returned error:",
        res.status,
        bodyText
      );
      return;
    }

    console.log("[coin-order] notify OK");
  } catch (err) {
    console.warn("[coin-order] network error:", err);
  }
}

