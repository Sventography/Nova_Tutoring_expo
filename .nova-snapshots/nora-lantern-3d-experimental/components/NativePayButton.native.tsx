import * as React from "react";
import { View } from "react-native";
import {
  ApplePayButton,
  isApplePaySupported,
  useStripe,
  ApplePay,
} from "@stripe/stripe-react-native";

/**
 * Shows Apple Pay if supported (iOS).
 * NOTE: You still need to create a PaymentIntent on your backend and confirm it.
 * This demo just presents the sheet and leaves the confirm hook for you.
 */
export default function PayButton() {
  const { presentApplePay } = useStripe();
  const [supported, setSupported] = React.useState(false);

  React.useEffect(() => {
    isApplePaySupported().then(setSupported).catch(() => setSupported(false));
  }, []);

  const onPress = async () => {
    const result = await presentApplePay({
      cartItems: [
        { label: "Support Nova", amount: "5.00", paymentType: ApplePay.PaymentType.Immediate },
      ],
      country: "US",
      currency: "USD",
      requiredBillingContactFields: ["postalAddress"],
    });

    if (result.error) {
      console.warn("Apple Pay error:", result.error);
      return;
    }

    // 🔗 Hook up your backend confirmation here (confirmApplePayPayment with client_secret)
    // For now we just notify success of presenting the sheet.
    console.log("Apple Pay sheet presented. Confirm on backend with client secret.");
  };

  if (!supported) return null;

  return (
    <View style={{ width: "100%", alignItems: "center" }}>
      <ApplePayButton
        onPress={onPress}
        type="plain"
        buttonStyle="black"
        borderRadius={6}
      />
    </View>
  );
}
