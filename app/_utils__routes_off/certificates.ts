import AsyncStorage from "@react-native-async-storage/async-storage";

export type CertificateInput = {
  name: string;
  quizTitle: string;
  scorePct: number;
  dateISO?: string;
};

const KEY = "certificates:v1";

export async function createCertificate(i: CertificateInput) {
  const raw = (await AsyncStorage.getItem(KEY)) || "[]";
  const list = JSON.parse(raw);
  const cert = { id: String(Date.now()), ...i, dateISO: i.dateISO || new Date().toISOString() };
  list.unshift(cert);
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
  return cert;
}

export async function listCertificates() {
  const raw = (await AsyncStorage.getItem(KEY)) || "[]";
  return JSON.parse(raw);
}
