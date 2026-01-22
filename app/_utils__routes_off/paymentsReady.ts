export function paymentsReady(): boolean {
  const pk = (process.env.EXPO_PUBLIC_STRIPE_PK || "").trim();
  return !!pk;
}
