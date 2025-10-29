import React from "react";
import { Platform, Pressable, Text } from "react-native";

/**
 * Fallback that renders something harmless when Apple/Google Pay
 * isn't available (e.g., web) so Expo Router won't treat this as a route.
 */
export default function NativePayButton() {
  if (Platform.OS === "web") {
    return <Text>Apple/Google Pay not available on web</Text>;
  }
  // On native, your real button should be used instead of this stub.
  return (
    <Pressable disabled>
      <Text>Apple/Google Pay</Text>
    </Pressable>
  );
}
