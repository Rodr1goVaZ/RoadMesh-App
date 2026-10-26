import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "@/src/core/config";
import { authEvents } from "@/src/core/auth/events";

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

let refreshPending: Promise<string | null> | null = null;
let generation = 0;

function tokenExpiry(token: string): number {
  try {
    const raw = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return Number(JSON.parse(atob(raw.padEnd(Math.ceil(raw.length / 4) * 4, "="))).exp) * 1000;
  } catch { return 0; }
}

async function freshToken(): Promise<string | null> {
  const token = await get(KEY);
  if (!token || tokenExpiry(token) > Date.now() + 120000) return token;
  if (!refreshPending) {
    const current = generation;
    refreshPending = (async () => {
      const response = await fetch(`${API_BASE}/auth/refresh`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) {
        if (response.status === 401 && current === generation) authEvents.emit(401);
        throw new Error(response.status === 401 ? "Sessão expirada. Entre novamente." : "Não foi possível renovar a sessão. Tente novamente.");
      }
      const body = await response.json();
      if (await get(KEY) !== token || current !== generation) return get(KEY);
      await set(KEY, body.access_token);
      return body.access_token as string;
    })().finally(() => { refreshPending = null; });
  }
  return refreshPending;
}

export const session = {
  saveSupport: (support: any) => set(SUPPORT_KEY, JSON.stringify(support)),
  getSupport: async () => { const value = await get(SUPPORT_KEY); try { return value ? JSON.parse(value) : null; } catch { return null; } },
  clearSupport: () => del(SUPPORT_KEY),
  saveToken: (t: string) => { generation++; return set(KEY, t); },
  getToken: () => get(KEY),
  clearToken: () => { generation++; return del(KEY); },
  getFreshToken: freshToken,
  saveUser: (u: any) => set(USER_KEY, JSON.stringify(u)),
  getUser: async () => {
    const v = await get(USER_KEY);
    try { return v ? JSON.parse(v) : null; } catch { return null; }
  },
  clearUser: () => del(USER_KEY),
};
