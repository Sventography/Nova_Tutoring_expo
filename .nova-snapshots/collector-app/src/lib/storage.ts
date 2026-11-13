import { Platform } from 'react-native';
let AsyncStorage: any;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {}

export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { window.localStorage.setItem(key, value); } catch {}
    return;
  }
  if (AsyncStorage) { await AsyncStorage.setItem(key, value); }
}

export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return window.localStorage.getItem(key); } catch { return null; }
  }
  if (AsyncStorage) { return await AsyncStorage.getItem(key); }
  return null;
}

export async function removeItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { window.localStorage.removeItem(key); } catch {}
    return;
  }
  if (AsyncStorage) { await AsyncStorage.removeItem(key); }
}

export async function clear(): Promise<void> {
  if (Platform.OS === 'web') {
    try { window.localStorage.clear(); } catch {}
    return;
  }
  if (AsyncStorage) { await AsyncStorage.clear(); }
}

const storage = { setItem, getItem, removeItem, clear };
export default storage;
