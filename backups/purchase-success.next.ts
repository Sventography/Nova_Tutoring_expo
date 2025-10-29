"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function PurchaseSuccessWeb() {
  const params = useSearchParams();
  const [done, setDone] = useState(false);
  const sku = params.get("sku") || "";
  const tx  = params.get("tx")  || "";

  useEffect(() => {
    // TODO: call your backend to verify tx and record order/entitlement
    // For demo we just show a success message.
    setDone(true);
  }, [sku, tx]);

  return (
    <main style={{display:"grid",placeItems:"center",minHeight:"60vh",color:"#cfeaf0"}}>
      <div>
        <h2>Success!</h2>
        <p>We’ve recorded your purchase of <strong>{sku}</strong>.</p>
        <p>You can return to the app at any time.</p>
      </div>
    </main>
  );
}
