import React from "react";
type Props = { amount: number; label: string };
export default function PayButton({ amount, label }: Props) {
  const handleClick = () => alert(`Web pay: $${amount/100}`);
  return (
    <button
      onClick={handleClick}
      style={{backgroundColor:"#00e5ff",color:"#06121a",fontWeight:"bold",
              padding:"12px 24px",borderRadius:"8px",border:"none",cursor:"pointer"}}
    >
      {label}
    </button>
  );
}
