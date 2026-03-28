import type React from "react";
import { createContext, useContext, useState } from "react";

export interface AuthState {
  token: string;
  role: "admin" | "gatekeeper" | "employee";
  name: string;
  employeeId: string; // string representation of bigint
}

interface AuthContextType {
  auth: AuthState | null;
  login: (state: AuthState) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  auth: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(() => {
    try {
      const saved = localStorage.getItem("attendify_auth");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  const login = (state: AuthState) => {
    setAuth(state);
    localStorage.setItem("attendify_auth", JSON.stringify(state));
  };

  const logout = () => {
    setAuth(null);
    localStorage.removeItem("attendify_auth");
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
