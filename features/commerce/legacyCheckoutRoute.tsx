import React from "react";
import { Redirect } from "expo-router";
import { STAGING_CHECKOUT_CLOSED } from "./staging";

function BrowseShop() {
  return <Redirect href="/(tabs)/shop" />;
}

// Legacy screens also fulfil orders on mount. Redirect before any of their hooks run.
export function legacyCheckoutRoute<P extends object>(screen: React.ComponentType<P>) {
  return STAGING_CHECKOUT_CLOSED ? BrowseShop : screen;
}
