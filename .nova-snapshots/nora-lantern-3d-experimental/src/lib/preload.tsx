import React from "react";
type Props = { children?: React.ReactNode };
export default function PreloadGate({ children }: Props) {
  return <>{children}</>;
}
