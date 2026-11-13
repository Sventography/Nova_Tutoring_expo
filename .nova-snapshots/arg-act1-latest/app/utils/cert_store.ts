import AsyncStorage from "@react-native-async-storage/async-storage";

export type CertRecord = {
  title: string;
  image: string;   // local file uri (png)
  fileUri: string; // same as image (for sharing)
  topic: string;
  username: string;
  date: string;
};

const KEY = "certificates";

/** Append a cert to storage (dedupe by title) */
export async function addCertRecord(c: CertRecord) {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list: CertRecord[] = raw ? JSON.parse(raw) : [];
    const exists = list.find(x => x.title === c.title);
    const next = exists ? list.map(x => x.title===c.title? c : x) : [...list, c];
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch (e) {
    console.warn("addCertRecord failed", e);
    return null;
  }
}

/** Read all certs */
export async function getCertRecords(): Promise<CertRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
