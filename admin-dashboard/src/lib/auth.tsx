import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { clearToken, getToken, loginAdmin, setToken, type Admin } from "./api";

type AuthContextValue = {
  admin: Admin | null;
  status: "loading" | "authenticated" | "unauthenticated";
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");

  useEffect(() => {
    const token = getToken();
    const stored = window.localStorage.getItem("gulit_cpa_admin_profile");
    if (token && stored) {
      setAdmin(JSON.parse(stored));
      setStatus("authenticated");
    } else {
      setStatus("unauthenticated");
    }
  }, []);

  const login = async (email: string, password: string) => {
    const { token, admin: a } = await loginAdmin(email, password);
    setToken(token);
    window.localStorage.setItem("gulit_cpa_admin_profile", JSON.stringify(a));
    setAdmin(a);
    setStatus("authenticated");
  };

  const logout = () => {
    clearToken();
    window.localStorage.removeItem("gulit_cpa_admin_profile");
    setAdmin(null);
    setStatus("unauthenticated");
  };

  return (
    <AuthContext.Provider value={{ admin, status, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
