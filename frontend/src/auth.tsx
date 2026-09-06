import React, { createContext, useContext, useEffect, useState } from "react";
import { session } from "./session";
import { api } from "./api";

export type User = {
  id: string;
  workshop_id: string;
  workshop_name: string;
  name: string;
  email: string;
  role: string;
};

type Ctx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (workshop: string, name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<Ctx>({} as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const t = await session.getToken();
      if (!t) { setLoading(false); return; }
      try {
        const me = await api.get("/auth/me");
        setUser(me);
      } catch {
        await session.clearToken();
        await session.clearUser();
      } finally { setLoading(false); }
    })();
  }, []);

  const doLogin = async (email: string, password: string) => {
    const r = await api.post("/auth/login", { email, password });
    await session.saveToken(r.access_token);
    await session.saveUser(r.user);
    setUser(r.user);
  };
  const doRegister = async (workshop: string, name: string, email: string, password: string) => {
    const r = await api.post("/auth/register", { workshop_name: workshop, name, email, password });
    await session.saveToken(r.access_token);
    await session.saveUser(r.user);
    setUser(r.user);
  };
  const logout = async () => {
    await session.clearToken();
    await session.clearUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login: doLogin, register: doRegister, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
