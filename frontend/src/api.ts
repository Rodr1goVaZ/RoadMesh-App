import { session } from "./session";
import { authEvents } from "./auth-events";

import { API_BASE } from "./config";

export { API_BASE } from "./config";

async function request(path: string, options: RequestInit = {}) {
  const publicAuth = path.endsWith("/login") || path === "/auth/forgot-password" || path === "/auth/reset-password";
  const token = publicAuth ? null : await session.getFreshToken();
  const support = publicAuth ? null : await session.getSupport();
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(support?.token ? { "X-Support-Token": support.token } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    if (!publicAuth && (res.status === 401 || res.status === 428)) authEvents.emit(res.status);
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
