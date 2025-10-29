import React, { PropsWithChildren, useEffect } from "react";

export default function PreloadGate({ children }: PropsWithChildren) {
  useEffect(() => {
    console.log("PreloadGate mounted");
  }, []);

  return <>{children}</>;
}

