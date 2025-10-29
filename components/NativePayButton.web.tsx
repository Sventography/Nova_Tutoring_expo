import React from "react";

export default function PayButton() {
  return (
    <button
      style={{ padding: 12, borderRadius: 8, cursor: "pointer" }}
      onClick={() => alert("Native Pay is only available on iOS/Android.")}
    >
      Apple/Google Pay (native only)
    </button>
  );
}
