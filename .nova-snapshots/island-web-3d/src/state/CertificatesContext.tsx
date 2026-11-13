import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
export type Cert = {
  id: string;
  name: string;
  topic: string;
  score: number;
  total: number;
  timeText: string;
  dateText: string;
  createdAt: number;
};
type Ctx = {
  certs: Cert[];
  add: (c: Omit<Cert, "id" | "createdAt">) => Promise<string>;
  remove: (id: string) => void;
  clear: () => void;
};
const CertificatesContext = createContext<Ctx>({
  certs: [],
  add: async () => "",
  remove: () => {},
  clear: () => {},
});
const KEY = "certificates_v1";
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
export const CertificatesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [certs, setCerts] = useState<Cert[]>([]);
  useEffect(() => {
    (async () => {
      const r = await AsyncStorage.getItem(KEY);
      if (r) {
        setCerts(JSON.parse(r));
      }
    })();
  }, []);
  useEffect(() => {
    AsyncStorage.setItem(KEY, JSON.stringify(certs));
  }, [certs]);
  const add = async (c: Omit<Cert, "id" | "createdAt">) => {
    const id = uid();
    const item: { id: string } & Cert = {
      id,
      createdAt: Date.now(),
      ...c,
    } as any;
    setCerts((p) => [item, ...p]);
    return id;
  };
  const remove = (id: string) => setCerts((p) => p.filter((x) => x.id !== id));
  const clear = () => setCerts([]);
  const v = useMemo(() => ({ certs, add, remove, clear }), [certs]);
  return (
    <CertificatesContext.Provider value={v}>
      {children}
    </CertificatesContext.Provider>
  );
};
export const useCertificates = () => useContext(CertificatesContext);
