import { useEffect } from "react";
export default function StripeProbe(){
  useEffect(()=>{
    const pk = (process?.env?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ? "[set]" : "[missing]");
    const be = (process?.env?.EXPO_PUBLIC_BACKEND_URL || "[missing]");
    console.log("EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY =", pk);
    console.log("EXPO_PUBLIC_BACKEND_URL =", be);
  },[]);
  return null;
}
