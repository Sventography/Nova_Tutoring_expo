import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
export const secure = {
  getItem: async (k: string) => Platform.OS === "web" ? AsyncStorage.getItem(k) : SecureStore.getItemAsync(k),
  setItem: async (k: string, v: string) => Platform.OS === "web" ? AsyncStorage.setItem(k, v) : SecureStore.setItemAsync(k, v),
  deleteItem: async (k: string) => Platform.OS === "web" ? AsyncStorage.removeItem(k) : SecureStore.deleteItemAsync(k),
};
