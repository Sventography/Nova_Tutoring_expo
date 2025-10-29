import React from "react";
import { View } from "react-native";

type Props = { children?: React.ReactNode };

function StripeWrapper({ children }: Props) {
  return <View style={{ flex: 1 }}>{children}</View>;
}

export default StripeWrapper;
export { StripeWrapper };
