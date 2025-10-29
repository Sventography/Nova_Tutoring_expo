import React from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

type Props = { clientSecret: string; publishableKey?: string; onSuccess?: () => void };

function InnerPay({ clientSecret, onSuccess }: { clientSecret: string; onSuccess?: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = React.useState(false);

  const pay = async () => {
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    setLoading(true);
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    });
    setLoading(false);
    if (error) {
      alert(error.message ?? "Payment error");
      return;
    }
    if (paymentIntent?.status === "succeeded") {
      onSuccess?.();
      alert("Payment complete!");
    }
  };

  return (
    <div style={{ display: "grid", gap: 12, padding: 12, maxWidth: 420 }}>
      <CardElement />
      <button disabled={!stripe || loading} onClick={pay}>
        {loading ? "Processing..." : "Pay"}
      </button>
    </div>
  );
}

export default function StripePay({ clientSecret, publishableKey, onSuccess }: Props) {
  const [stripePromise, setStripePromise] = React.useState<Promise<any> | null>(null);

  React.useEffect(() => {
    if (!stripePromise) {
      const key = publishableKey || (process.env.EXPO_PUBLIC_STRIPE_PK as string);
      setStripePromise(loadStripe(key));
    }
  }, [publishableKey, stripePromise]);

  if (!stripePromise) return null;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <InnerPay clientSecret={clientSecret} onSuccess={onSuccess} />
    </Elements>
  );
}
