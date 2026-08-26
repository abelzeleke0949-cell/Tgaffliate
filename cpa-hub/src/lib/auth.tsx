import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import {
  clearToken,
  getMe,
  getToken,
  loginMerchant,
  registerMerchant,
  setToken,
  type Merchant,
} from "@/lib/api";

type AuthContextValue = {
  merchant: Merchant | null;
  status: "loading" | "authenticated" | "unauthenticated";
  login: (email: string, password: string) => Promise<void>;
  register: (businessName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");

  const refresh = async () => {
    const token = getToken();
    if (!token) {
      setMerchant(null);
      setStatus("unauthenticated");
      return;
    }
    try {
      const me = await getMe();
      setMerchant(me);
      setStatus("authenticated");
    } catch {
      clearToken();
      setMerchant(null);
      setStatus("unauthenticated");
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (email: string, password: string) => {
    const { token, merchant: m } = await loginMerchant({ email, password });
    setToken(token);
    setMerchant(m);
    setStatus("authenticated");
  };

  const register = async (businessName: string, email: string, password: string) => {
    const { token, merchant: m } = await registerMerchant({ businessName, email, password });
    setToken(token);
    setMerchant(m);
    setStatus("authenticated");
  };

  const logout = () => {
    clearToken();
    setMerchant(null);
    setStatus("unauthenticated");
  };

  return (
    <AuthContext.Provider value={{ merchant, status, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
