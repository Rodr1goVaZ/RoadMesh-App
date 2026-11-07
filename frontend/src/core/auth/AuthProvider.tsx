import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { CompanyModule, companyHome } from "@/src/core/auth/company-modules";
import { session } from "@/src/core/auth/session";
import { AppState, Platform } from "react-native";
import { api } from "@/src/core/http/api";
import { queryClient } from "@/src/core/query-client";
import { FeatureConfiguration } from "@/src/core/auth/company-features";
import { authEvents } from "@/src/core/auth/events";

export type User = FeatureConfiguration & { id: string; workshop_id?: string; workshop_name: string; client_id?: string; name: string; email: string; avatar_url?: string | null;
  role: "admin" | "workshop_staff" | "client"; password_change_required: boolean; is_active: boolean;
  can_manage_workshop?: boolean; modules?: CompanyModule[] };
type Support = FeatureConfiguration & { id: string; name: string; status: string; token: string; modules?: CompanyModule[] };
type Ctx = { user: User | null; loading: boolean; support: Support | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>; changePassword: (current: string, next: string) => Promise<User>;
  updateProfile: (name: string) => Promise<void>; updateAvatar: (photo: FormData | null) => Promise<void>;
  startSupport: (id: string) => Promise<Support>; endSupport: () => Promise<void> };
const AuthContext = createContext<Ctx>({} as Ctx);

export function homeFor(user: User | null): any {
  if (!user) return "/(auth)/login";
  if (user.password_change_required) return "/(auth)/change-password";
  return user.role === "admin" ? "/(admin)/dashboard" : user.role === "client" ? "/(portal)/inicio" : companyHome(user);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [support, setSupport] = useState<Support | null>(null);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const clear = async () => {
    generation.current++;
    setSupport(null); setUser(null);
    const cancelled = queryClient.cancelQueries();
    queryClient.clear();
    await Promise.all([cancelled, session.clearToken(), session.clearUser(), session.clearSupport()]);
    // Let protected screens unmount before removing any queued local draft writes.
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    await session.clearPrivateDrafts();
  };
  useEffect(() => {
    authEvents.listen(status => { if (status === 401) void clear(); else setUser(prev => prev ? { ...prev, password_change_required: true } : null); });
    (async () => {
      const started = generation.current;
      if (!await session.getToken()) { setLoading(false); return; }
      try {
        const me = await api.get("/auth/me");
        if (started !== generation.current) return;
        setUser(me);
        if (me.role === "admin" && !me.password_change_required) setSupport(await session.getSupport());
        else await session.clearSupport();
      } catch { await clear(); }
      finally { setLoading(false); }
    })();
    return () => authEvents.listen(null);
  }, []);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const redirect = () => { window.location.replace("/login"); };
    const storageChanged = (event: StorageEvent) => {
      if ((event.key === "roadmesh_token" && !event.newValue) || event.key === null) void clear().finally(redirect);
    };
    // A browser-restored document must revalidate from storage instead of showing an old React tree.
    const pageHide = (event: PageTransitionEvent) => { if (event.persisted) document.documentElement.style.visibility = "hidden"; };
    const pageShow = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload(); };
    window.addEventListener("storage", storageChanged);
    window.addEventListener("pagehide", pageHide);
    window.addEventListener("pageshow", pageShow);
    return () => { window.removeEventListener("storage", storageChanged); window.removeEventListener("pagehide", pageHide); window.removeEventListener("pageshow", pageShow); };
  }, []);
  useEffect(() => {
    if (!user) return;
    const renew = async () => {
      const started = generation.current;
      try {
        const me: User = await api.get("/auth/me");
        if (started !== generation.current) return;
        const changed = JSON.stringify([user.subscription_version, user.enabled_modules, user.modules]) !== JSON.stringify([me.subscription_version, me.enabled_modules, me.modules]);
        if (changed) { await queryClient.cancelQueries(); queryClient.clear(); }
        if (started !== generation.current) return;
        setUser(previous => previous?.id === me.id ? me : previous);
        if (support) {
          const company = await api.get(`/admin/workshops/${support.id}`);
          if (started !== generation.current) return;
          const next = { ...support, subscription_version: company.subscription_version, enabled_modules: company.enabled_modules, modules: company.modules };
          if (JSON.stringify(next) !== JSON.stringify(support)) {
            await queryClient.cancelQueries(); queryClient.clear(); await session.saveSupport(next); setSupport(next);
          }
        }
      } catch { /* API authentication errors clear the session; a network error is retried on the next refresh. */ }
    };
    const timer = setInterval(() => void renew(), 15000);
    const listener = AppState.addEventListener("change", state => { if (state === "active") void renew(); });
    const focus = () => { void renew(); };
    if (Platform.OS === "web") window.addEventListener("focus", focus);
    return () => { clearInterval(timer); listener.remove(); if (Platform.OS === "web") window.removeEventListener("focus", focus); };
  }, [user, support]);
  const accept = async (response: any) => {
    const started = generation.current;
    await session.saveToken(response.access_token); ensureCurrent(started);
    await session.clearSupport(); ensureCurrent(started);
    queryClient.clear(); setSupport(null); setUser(response.user);
    return response.user as User;
  };
  const ensureCurrent = (started: number) => { if (started !== generation.current) throw new Error("Sessão terminada. Entre novamente."); };
  const login = async (email: string, password: string) => {
    const started = generation.current; const response = await api.post("/auth/login", { email, password });
    ensureCurrent(started); return accept(response);
  };
  const changePassword = async (current: string, next: string) => {
    const started = generation.current; const response = await api.post("/auth/change-password", { current_password: current, new_password: next });
    ensureCurrent(started); return accept(response);
  };
  const updateUser = async (request: Promise<User>) => {
    const started = generation.current; const updated = await request;
    ensureCurrent(started); setUser(updated);
  };
  const updateProfile = (name: string) => updateUser(api.put("/auth/me", { name }));
  const updateAvatar = (photo: FormData | null) => updateUser(photo ? api.uploadTo("/auth/me/avatar", photo) : api.del("/auth/me/avatar"));
  const logout = async () => {
    const token = await session.getToken();
    const revoked = token ? session.revoke(token).catch(() => { /* Offline logout still clears this device. */ }) : Promise.resolve();
    try { await clear(); await revoked; }
    finally { if (Platform.OS === "web") window.location.replace("/login"); }
  };
  const startSupport = async (id: string) => {
    const started = generation.current;
    const response = await api.post(`/admin/workshops/${id}/support`, { reason: "Assistência administrativa à oficina" });
    ensureCurrent(started);
    const context = { ...response.workshop, token: response.support_token };
    await session.saveSupport(context); queryClient.clear(); setSupport(context); return context;
  };
  const endSupport = async () => {
    try { await api.del("/admin/support"); } finally { await session.clearSupport(); queryClient.clear(); setSupport(null); }
  };
  return <AuthContext.Provider value={{ user, loading, support, login, logout, changePassword, updateProfile, updateAvatar, startSupport, endSupport }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
