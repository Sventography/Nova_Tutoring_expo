import { getJSON, setJSON } from "./storage";

export type Certificate = {
  id: string;
  title: string;
  username: string;
  topic?: string;
  score?: number;
  issuedAt: string;
  imageUri?: string;
  data?: Record<string, any>;
};

const KEY = "CERT_STORE";

async function load(): Promise<Record<string, Certificate>> {
  const data = await getJSON<Record<string, Certificate>>(KEY);
  return data || {};
}

async function save(store: Record<string, Certificate>) {
  await setJSON(KEY, store);
}

export async function listCertificates(username?: string): Promise<Certificate[]> {
  const store = await load();
  const all = Object.values(store);
  return username ? all.filter(c => c.username === username) : all;
}

export async function getCertificate(id: string): Promise<Certificate | null> {
  const store = await load();
  return store[id] || null;
}

export async function issueCertificate(
  params: {
    title: string;
    username: string;
    topic?: string;
    score?: number;
    imageUri?: string;
    data?: Record<string, any>;
  }
): Promise<Certificate> {
  const store = await load();
  const id = Math.random().toString(36).slice(2);
  const cert: Certificate = {
    id,
    title: params.title,
    username: params.username,
    topic: params.topic,
    score: params.score,
    imageUri: params.imageUri,
    data: params.data,
    issuedAt: new Date().toISOString(),
  };
  store[id] = cert;
  await save(store);
  return cert;
}

export async function updateCertificate(
  id: string,
  patch: Partial<Omit<Certificate, "id" | "issuedAt">>
): Promise<Certificate | null> {
  const store = await load();
  const curr = store[id];
  if (!curr) return null;
  const next: Certificate = { ...curr, ...patch };
  store[id] = next;
  await save(store);
  return next;
}

export async function removeCertificate(id: string): Promise<boolean> {
  const store = await load();
  if (!store[id]) return false;
  delete store[id];
  await save(store);
  return true;
}

export async function findByTopicForUser(username: string, topic: string): Promise<Certificate | null> {
  const store = await load();
  const hit = Object.values(store).find(c => c.username === username && c.topic === topic);
  return hit || null;
}

export default {
  listCertificates,
  getCertificate,
  issueCertificate,
  updateCertificate,
  removeCertificate,
  findByTopicForUser,
};
