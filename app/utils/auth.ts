import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_KEY = "@nova/user";

export type NovaUser = {
  email: string;
  name: string;
  avatar?: string | null;
  createdAt: number;
  password?: string; // demo only
};

function normEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

async function getStoredUser(): Promise<NovaUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as NovaUser; } catch { return null; }
}

async function setStoredUser(u: NovaUser | null): Promise<void> {
  if (!u) { await AsyncStorage.removeItem(USER_KEY); return; }
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
}

export async function authGetUser(): Promise<NovaUser | null> {
  return getStoredUser();
}

export async function authSetAvatar(uri: string): Promise<void> {
  const u = await getStoredUser();
  if (!u) return;
  u.avatar = uri;
  await setStoredUser(u);
}

export async function authLogout(): Promise<void> {
  await setStoredUser(null);
}

export async function authRegister(email: string, pass: string): Promise<boolean> {
  const e = normEmail(email);
  const existing = await getStoredUser();
  if (existing && normEmail(existing.email) === e) return false; // already registered
  const name = (e.split("@")[0] || "Guest").trim();
  const u: NovaUser = { email: e, name, avatar: null, createdAt: Date.now(), password: pass };
  await setStoredUser(u);
  return true;
}

// Strict login: only succeeds if user exists and password matches.
export async function authLogin(email: string, pass: string): Promise<boolean> {
  const e = normEmail(email);
  const u = await getStoredUser();
  if (!u) return false;
  return normEmail(u.email) === e && u.password === pass;
}

// Friendly login: creates the user if none exists; otherwise requires password match.
export async function authUpsertLogin(email: string, pass: string): Promise<boolean> {
  const e = normEmail(email);
  const u = await getStoredUser();
  if (!u) {
    const name = (e.split("@")[0] || "Guest").trim();
    await setStoredUser({ email: e, name, avatar: null, createdAt: Date.now(), password: pass });
    return true;
  }
  if (normEmail(u.email) !== e) {
    // Single-user demo store — replace with this email
    const name = (e.split("@")[0] || "Guest").trim();
    await setStoredUser({ email: e, name, avatar: u.avatar ?? null, createdAt: Date.now(), password: pass });
    return true;
  }
  return u.password === pass;
}

// Danger: wipes local demo account (useful if password forgotten)
export async function authResetLocal(): Promise<void> {
  await setStoredUser(null);
}
