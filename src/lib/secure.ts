import * as SecureStore from 'expo-secure-store';

export async function setSecureItem(key: string, value: string) { await SecureStore.setItemAsync(key, value); }
export async function getSecureItem(key: string) { return await SecureStore.getItemAsync(key); }
export async function deleteSecureItem(key: string) { await SecureStore.deleteItemAsync(key); }

// convenient aliases
export const save = setSecureItem;
export const get = getSecureItem;
export const remove = deleteSecureItem;

const secure = { setSecureItem, getSecureItem, deleteSecureItem, save, get, remove };
export default secure;
