import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type PM = Record<string, true>;

export default function usePurchasesMap() {
  const [map, setMap] = useState<PM>({});
  useEffect(() => {
    AsyncStorage.getItem("purchases").then(v => {
      if (v) {
        try { setMap(JSON.parse(v) as PM); } catch {}
      }
    });
  }, []);
  return map;
}
