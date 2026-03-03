// app/utils/certificates.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";

export type CertificateRecord = {
  id: string;
  userId: string | null;
  name?: string;
  username?: string;
  quizTitle: string;
  scorePct: number;
  dateISO: string;
};

export type CertificateInput = {
  name: string;
  quizTitle: string;
  scorePct: number;
  dateISO?: string;
};

const KEY = "@nova/certificates.v2";

// Get the current Supabase user id, if logged in
async function getUserId(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

export async function createCertificate(
  input: CertificateInput
): Promise<CertificateRecord> {
  const userId = await getUserId();
  const safeName = (input.name || "Nova Student").trim();
  const dateISO = input.dateISO || new Date().toISOString();

  const raw = (await AsyncStorage.getItem(KEY)) || "[]";
  let list: CertificateRecord[] = [];
  try {
    list = JSON.parse(raw) || [];
  } catch {
    list = [];
  }

  const rec: CertificateRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    userId,
    name: safeName,
    quizTitle: input.quizTitle,
    scorePct: input.scorePct,
    dateISO,
  };

  list.unshift(rec);
  if (list.length > 200) list = list.slice(0, 200);

  await AsyncStorage.setItem(KEY, JSON.stringify(list));
  return rec;
}

export async function listCertificates(): Promise<CertificateRecord[]> {
  const userId = await getUserId();
  const raw = (await AsyncStorage.getItem(KEY)) || "[]";
  let list: CertificateRecord[] = [];
  try {
    list = JSON.parse(raw) || [];
  } catch {
    list = [];
  }

  // If not logged in, show only guest certs (userId === null)
  if (!userId) {
    return list.filter((c) => !c.userId);
  }

  // Logged in: only show certs for this Supabase user
  return list.filter((c) => c.userId === userId);
}

export async function clearAllCertificates() {
  await AsyncStorage.removeItem(KEY);
}