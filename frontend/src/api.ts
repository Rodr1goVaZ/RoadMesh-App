import { session } from "./session";
import Constants from "expo-constants";

export const API_BASE = `${(Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || "").replace(/\/$/, "")}/api`;

async function request(path: string, options: RequestInit = {}) {
  const token = await session.getToken();
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const msg = body?.detail || body?.message || `Erro ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : "Erro na API");
  }
  return body;
}

export const api = {
  upload: (data: FormData) => request("/media", { method: "POST", body: data }),
  get: (p: string) => request(p),
  post: (p: string, data: any) => request(p, { method: "POST", body: JSON.stringify(data) }),
  put: (p: string, data: any) => request(p, { method: "PUT", body: JSON.stringify(data) }),
  del: (p: string) => request(p, { method: "DELETE" }),
};
