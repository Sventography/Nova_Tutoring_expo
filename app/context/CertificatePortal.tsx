import React, { createContext, useContext, useRef, useState } from "react";
import { View } from "react-native";
import CertificateView from "../components/CertificateView";

type CertState = { username: string; topic: string; date: string } | null;
type CertPortalContextType = { render: (c: CertState) => Promise<any> };

const CertPortalContext = createContext<CertPortalContextType>({ render: async () => {} });

export function useCertPortal() {
  return useContext(CertPortalContext);
}

export function CertPortalProvider({ children }: { children: React.ReactNode }) {
  const [certProps, setCertProps] = useState<CertState>(null);
  const ref = useRef<any>(null);

  async function render(c: CertState) {
    return new Promise((resolve) => {
      setCertProps(c);
      setTimeout(() => resolve(ref.current), 300); // allow mount
    });
  }

  return (
    <CertPortalContext.Provider value={{ render }}>
      {children}
      {certProps && (
        <View style={{ position: "absolute", top: -9999, left: -9999 }}>
          <CertificateView ref={ref} {...certProps} />
        </View>
      )}
    </CertPortalContext.Provider>
  );
}
