import * as React from "react";

/**
 * Platform-agnostic fallback for StripePay.
 * Having this file alongside StripePay.web.tsx satisfies Expo Router’s
 * “needs a fallback sibling file” rule.
 */
export default function StripePay() {
  return null; // or a tiny placeholder if you want
}
