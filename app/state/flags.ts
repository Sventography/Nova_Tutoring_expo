import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "flags:v1";

export type Flags = Record<string, boolean>;

async function read(): Promise<Flags> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return {};
  try { return JSON.parse(raw) as Flags; } catch { return {}; }
}

async function write(f: Flags) {
  await AsyncStorage.setItem(KEY, JSON.stringify(f));
}

export async function allFlags(): Promise<Flags> {
  return read();
}

export async function getFlag(name: string, fallback = false): Promise<boolean> {
  const f = await read();
  return Object.prototype.hasOwnProperty.call(f, name) ? !!f[name] : fallback;
}

export async function setFlag(name: string, value: boolean): Promise<Flags> {
  const f = await read();
  const next = { ...f, [name]: !!value };
  await write(next);
  return next;
}

export async function toggleFlag(name: string): Promise<{ value: boolean; flags: Flags }> {
  const f = await read();
  const value = !f[name];
  const next = { ...f, [name]: value };
  await write(next);
  return { value, flags: next };
}

export async function resetFlags(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

const flags = { allFlags, getFlag, setFlag, toggleFlag, resetFlags };
export default flags;
