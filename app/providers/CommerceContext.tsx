import React, { createContext, useContext } from "react";

type CommerceApi = {
  // add real methods later
  ready: boolean;
};

const CommerceCtx = createContext<CommerceApi | null>(null);

export function CommerceProvider({ children }: { children: React.ReactNode }) {
  return (
    <CommerceCtx.Provider value={{ ready: true }}>
      {children}
    </CommerceCtx.Provider>
  );
}

export const useCommerce = () => {
  const ctx = useContext(CommerceCtx);
  if (!ctx) throw new Error("useCommerce must be used within CommerceProvider");
  return ctx;
};
