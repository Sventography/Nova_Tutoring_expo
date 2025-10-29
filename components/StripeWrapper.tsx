import * as React from "react";

/**
 * Fallback sibling for StripeWrapper.
 * Exists to satisfy Expo Router's requirement for a non-platform file
 * when a .web.tsx file is present.
 */
export default function StripeWrapper(): JSX.Element {
  return null; // keep it invisible; you can add real shared UI later
}
