// app/_lib/aiSubscriptionIap.ts
//
// Nova AI subscription StoreKit helpers.
// Shop owns the single purchase listener; this module only fetches,
// starts, and server-verifies subscription transactions.

import { Platform } from "react-native";
import * as ExpoIAP from "expo-iap";

import {
  AI_SUBSCRIPTION_PRODUCT_IDS,
} from "./aiPlans";

import { supabase } from "../lib/supabase";

const BACKEND_BASE_URL = (
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  "https://nove-tutoring-backend.onrender.com"
).replace(/\/+$/, "");

const AI_SUBSCRIPTION_IDS =
  new Set<string>(
    AI_SUBSCRIPTION_PRODUCT_IDS
  );

export function isNovaAiSubscriptionProductId(
  value: string | null | undefined
): boolean {
  const productId = String(
    value || ""
  ).trim();

  return (
    !!productId &&
    AI_SUBSCRIPTION_IDS.has(
      productId
    )
  );
}

export function getNovaAiPurchaseProductId(
  purchase: any
): string {
  return String(
    purchase?.productId || ""
  ).trim();
}

export function getNovaAiPurchaseTransactionId(
  purchase: any
): string {
  return String(
    purchase?.transactionId ||
      purchase?.id ||
      purchase?.purchaseToken ||
      ""
  ).trim();
}

export async function fetchNovaAiSubscriptionProducts(
  productIds: readonly string[] =
    AI_SUBSCRIPTION_PRODUCT_IDS
): Promise<any[]> {
  const ids = Array.from(
    new Set(
      productIds
        .map((value) =>
          String(value || "").trim()
        )
        .filter(Boolean)
    )
  );

  if (!ids.length) {
    return [];
  }

  const products =
    await ExpoIAP.fetchProducts({
      skus: ids,
      type: "subs",
    });

  return Array.isArray(products)
    ? products
    : [];
}

export async function requestNovaAiSubscriptionPurchase({
  productId,
  appAccountToken,
}: {
  productId: string;
  appAccountToken: string;
}) {
  const sku = String(
    productId || ""
  ).trim();

  const accountToken = String(
    appAccountToken || ""
  ).trim();

  if (!sku) {
    throw new Error(
      "Nova AI is missing the App Store subscription identifier."
    );
  }

  if (!accountToken) {
    throw new Error(
      "Sign in to your Nova account before subscribing."
    );
  }

  if (Platform.OS !== "ios") {
    throw new Error(
      "Nova AI subscriptions are currently configured for the iOS App Store."
    );
  }

  await ExpoIAP.requestPurchase({
    request: {
      apple: {
        sku,
        appAccountToken:
          accountToken,
      },
      google: {
        skus: [sku],
      },
    },
    type: "subs",
  });
}

const AI_VERIFY_RETRY_DELAYS_MS = [
  0,
  1000,
  2000,
  4000,
  8000,
] as const;

function waitForAiVerification(
  milliseconds: number
): Promise<void> {
  if (milliseconds <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function makeVerificationPendingError(
  detail?: string
): Error {
  const error: any = new Error(
    "Apple completed the purchase, but Nova is still waiting for Apple to confirm the transaction. Your plan will update automatically as soon as verification is available."
  );

  error.code =
    "APPLE_VERIFICATION_PENDING";

  if (detail) {
    error.detail = detail;
  }

  return error;
}

export async function verifyNovaAiSubscriptionOnServer({
  purchase,
  expectedProductId,
}: {
  purchase: any;
  expectedProductId?: string | null;
}): Promise<any> {
  if (Platform.OS !== "ios") {
    throw new Error(
      "Apple subscription verification is only available on iOS."
    );
  }

  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(
      "Nova could not read your signed-in session."
    );
  }

  const accessToken =
    sessionData.session?.access_token ||
    "";

  if (!accessToken) {
    throw new Error(
      "Sign in to your Nova account before verifying this subscription."
    );
  }

  const transactionId =
    getNovaAiPurchaseTransactionId(
      purchase
    );

  const purchasedProductId =
    getNovaAiPurchaseProductId(
      purchase
    );

  const productId = String(
    expectedProductId ||
      purchasedProductId ||
      ""
  ).trim();

  if (!transactionId) {
    throw new Error(
      "Apple completed the purchase, but Nova did not receive a transaction identifier."
    );
  }

  if (
    !productId ||
    !isNovaAiSubscriptionProductId(
      productId
    )
  ) {
    throw new Error(
      "Apple returned an unrecognized Nova AI subscription."
    );
  }

  if (
    purchasedProductId &&
    purchasedProductId !== productId
  ) {
    throw new Error(
      "The Apple purchase did not match the selected Nova AI plan."
    );
  }

  let lastTransientDetail = "";

  for (
    let attempt = 0;
    attempt <
    AI_VERIFY_RETRY_DELAYS_MS.length;
    attempt += 1
  ) {
    const delay =
      AI_VERIFY_RETRY_DELAYS_MS[
        attempt
      ];

    if (delay > 0) {
      console.log(
        "[AI IAP] waiting before verification retry",
        {
          attempt:
            attempt + 1,
          delay,
          productId,
          transactionId,
        }
      );

      await waitForAiVerification(
        delay
      );
    }

    let response: Response;

    try {
      response = await fetch(
        `${BACKEND_BASE_URL}/api/apple-subscriptions/verify`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            transaction_id:
              transactionId,
            product_id:
              productId,
            environment:
              purchase?.environmentIOS ||
              null,
          }),
        }
      );
    } catch (networkError: any) {
      lastTransientDetail = String(
        networkError?.message ||
          networkError ||
          "Network verification error"
      );

      const hasMoreAttempts =
        attempt <
        AI_VERIFY_RETRY_DELAYS_MS.length -
          1;

      console.warn(
        "[AI IAP] verification network attempt failed",
        {
          attempt:
            attempt + 1,
          productId,
          transactionId,
          error:
            lastTransientDetail,
        }
      );

      if (hasMoreAttempts) {
        continue;
      }

      throw makeVerificationPendingError(
        lastTransientDetail
      );
    }

    const raw =
      await response.text();

    let payload: any = null;

    try {
      payload = raw
        ? JSON.parse(raw)
        : null;
    } catch {
      payload = null;
    }

    if (
      response.ok &&
      payload?.ok &&
      payload?.verified
    ) {
      if (attempt > 0) {
        console.log(
          "[AI IAP] verification succeeded after retry",
          {
            attempt:
              attempt + 1,
            productId,
            transactionId,
          }
        );
      }

      return payload;
    }

    const message = String(
      payload?.error ||
        payload?.message ||
        raw ||
        "Nova could not verify this Apple subscription."
    );

    const lower =
      message.toLowerCase();

    /*
     * These failures may be temporary while a new StoreKit
     * subscription transaction propagates to Apple's server API.
     *
     * Do NOT retry account/product ownership conflicts.
     */
    const transactionNotReady =
      response.status === 404 ||
      (
        lower.includes(
          "transaction"
        ) &&
        lower.includes(
          "not found"
        )
      );

    const transientServerFailure =
      response.status === 429 ||
      response.status >= 500;

    const isTransient =
      transactionNotReady ||
      transientServerFailure;

    if (!isTransient) {
      const error: any =
        new Error(message);

      error.code =
        "APPLE_VERIFICATION_REJECTED";

      error.status =
        response.status;

      throw error;
    }

    lastTransientDetail =
      message;

    console.warn(
      "[AI IAP] Apple verification not ready yet",
      {
        attempt:
          attempt + 1,
        status:
          response.status,
        productId,
        transactionId,
        message,
      }
    );

    const hasMoreAttempts =
      attempt <
      AI_VERIFY_RETRY_DELAYS_MS.length -
        1;

    if (hasMoreAttempts) {
      continue;
    }

    throw makeVerificationPendingError(
      lastTransientDetail
    );
  }

  throw makeVerificationPendingError(
    lastTransientDetail
  );
}


export async function openNovaAiSubscriptionManagement(): Promise<void> {
  if (Platform.OS !== "ios") {
    throw new Error(
      "Subscription management is currently available through Apple on iOS."
    );
  }

  const openSubscriptions =
    (ExpoIAP as any)
      .deepLinkToSubscriptions;

  if (
    typeof openSubscriptions !==
    "function"
  ) {
    throw new Error(
      "Apple subscription management is unavailable in this build."
    );
  }

  /*
   * Passing an empty options object is compatible with the
   * cross-platform Expo IAP helper. Android-only SKU options
   * are intentionally omitted.
   */
  await Promise.resolve(
    openSubscriptions({})
  );
}
