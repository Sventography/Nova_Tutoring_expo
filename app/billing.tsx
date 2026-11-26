import React from "react";
import { Redirect } from "expo-router";

// The retired billing form granted items from client input. The Shop owns checkout.
export default function Billing() {
  return <Redirect href="/(tabs)/shop" />;
}
