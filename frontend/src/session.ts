import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "roadmesh_token";
const USER_KEY = "roadmesh_user";
const SUPPORT_KEY = "roadmesh_support";

async function set(key: string, value: string) {
  if (Platform.OS === "web") await AsyncStorage.setItem(key, value);
  else await SecureStore.setItemAsync(key, value);
}
async function get(key: string): Promise<string | null> {
  if (Platform.OS === "web") return AsyncStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}
async function del(key: string) {
  if (Platform.OS === "web") await AsyncStorage.removeItem(key);
  else await SecureStore.deleteItemAsync(key);
}

export const session = {
  saveSupport: (support: any) => set(SUPPORT_KEY, JSON.stringify(support)),
  getSupport: async () => { const value = await get(SUPPORT_KEY); try { return value ? JSON.parse(value) : null; } catch { return null; } },
  clearSupport: () => del(SUPPORT_KEY),
  saveToken: (t: string) => set(KEY, t),
  getToken: () => get(KEY),
  clearToken: () => del(KEY),
  saveUser: (u: any) => set(USER_KEY, JSON.stringify(u)),
  getUser: async () => {
    const v = await get(USER_KEY);
    try { return v ? JSON.parse(v) : null; } catch { return null; }
  },
  clearUser: () => del(USER_KEY),
};
