import * as React from "react";

type Props = {
  label?: string;
  onPress?: () => void;
  disabled?: boolean;
};
export default function PayButtonWeb({ label = "Pay", onPress, disabled }: Props) {
  return (
    <button onClick={onPress} disabled={disabled} style={{ padding: 12, borderRadius: 8 }}>
      {label}
    </button>
  );
}
