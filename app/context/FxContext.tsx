import React, { createContext, useContext, useState } from "react";

type FxContextType = {
  enabled: boolean;
  toggleFx: () => void;
};

const FxContext = createContext<FxContextType>({
  enabled: false,
  toggleFx: () => {},
});

export function FxProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  function toggleFx() {
    setEnabled((v) => !v);
  }

  return (
    <FxContext.Provider value={{ enabled, toggleFx }}>
      {children}
    </FxContext.Provider>
  );
}

export function useFx() {
  return useContext(FxContext);
}
