import React, { createContext, useContext, useEffect, useState } from "react";
import { session } from "./session";
import { api } from "./api";
import { queryClient } from "./query-client";
import { authEvents } from "./auth-events";

export type User = { id: string; workshop_id?: string; workshop_name: string; client_id?: string; name: string; email: string;
  role: "admin" | "workshop_staff" | "client"; password_change_required: boolean; is_active: boolean };
type Support = { id: string; name: string; status: string; token: string };
type Ctx = { user: User | null; loading: boolean; support: Support | null;
  login: (email: string, password: string, kind?: "staff" | "admin" | "client") => Promise<User>;
  logout: () => Promise<void>; changePassword: (current: string, next: string) => Promise<User>;
  startSupport: (id: string) => Promise<void>; endSupport: () => Promise<void> };
const AuthContext = createContext<Ctx>({} as Ctx);

export function homeFor(user: User | null): any {
  if (!user) return "/(auth)/login";
  if (user.password_change_required) return "/(auth)/change-password";
  return user.role === "admin" ? "/(admin)/dashboard" : user.role === "client" ? "/(portal)/marcacoes" : "/(app)/inicio";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [support, setSupport] = useState<Support | null>(null);
  const [loading, setLoading] = useState(true);
  const clear = async () => {
    await Promise.all([session.clearToken(), session.clearUser(), session.clearSupport()]);
    queryClient.clear(); setSupport(null); setUser(null);
  };
  useEffect(() => {
    authEvents.listen(status => { if (status === 401) void clear(); else setUser(prev => prev ? { ...prev, password_change_required: true } : null); });
    (async () => {
      if (!await session.getToken()) { setLoading(false); return; }
      try {
        const me = await api.get("/auth/me");
        setUser(me);
        if (me.role === "admin" && !me.password_change_required) setSupport(await session.getSupport());
        else await session.clearSupport();
      } catch { await clear(); }
      finally { setLoading(false); }
    })();
    return () => authEvents.listen(null);
  }, []);
  const accept = async (response: any) => {
    await session.saveToken(response.access_token); await session.saveUser(response.user);
    await session.clearSupport(); queryClient.clear(); setSupport(null); setUser(response.user);
    return response.user as User;
  };
  const login = async (email: string, password: string, kind: "staff" | "admin" | "client" = "staff") => accept(await api.post(`/auth/${kind}/login`, { email, password }));
  const changePassword = async (current: string, next: string) => accept(await api.post("/auth/change-password", { current_password: current, new_password: next }));
  const logout = async () => { try { await api.post("/auth/logout", {}); } finally { await clear(); } };
  const startSupport = async (id: string) => {
    const response = await api.post(`/admin/workshops/${id}/support`, { reason: "Assistência administrativa à oficina" });
    const context = { ...response.workshop, token: response.support_token };
    await session.saveSupport(context); queryClient.clear(); setSupport(context);
  };
  const endSupport = async () => {
    try { await api.del("/admin/support"); } finally { await session.clearSupport(); queryClient.clear(); setSupport(null); }
  };
  return <AuthContext.Provider value={{ user, loading, support, login, logout, changePassword, startSupport, endSupport }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);