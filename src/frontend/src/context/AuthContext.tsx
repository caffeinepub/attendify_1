import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";

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

  const authToken = auth?.token ?? null;

  // Validate session on app load — clears stale tokens from previous deploys
  useEffect(() => {
    if (!authToken) return;
    const canisterId =
      (window as any).__BACKEND_CANISTER_ID__ ||
      import.meta.env.VITE_BACKEND_CANISTER_ID ||
      import.meta.env.VITE_CANISTER_ID_BACKEND;
    if (!canisterId) return;

    import("../backend").then(({ createActor, ExternalBlob }) => {
      const actor = createActor(
        canisterId,
        async (f: any) => new Uint8Array(await f.getBytes()),
        async (b: any) => ExternalBlob.fromBytes(b),
      );
      actor
        .validateSession(authToken)
        .then((valid: boolean) => {
          if (!valid) {
            // Token is stale (canister was upgraded) — force re-login
            setAuth(null);
            localStorage.removeItem("attendify_auth");
          }
        })
        .catch(() => {
          // Network error — don't log out, let user retry
        });
    });
  }, [authToken]);

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
