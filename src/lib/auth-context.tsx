"use client";

import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import { usePrivy } from "@privy-io/react-auth";

type AuthContextValue = {
  ready: boolean;
  authenticated: boolean;
  walletAddress: string | null;
  login: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function MockAuthProvider({ children }: { children: ReactNode }) {
  const value: AuthContextValue = {
    ready: true,
    authenticated: false,
    walletAddress: null,
    login: () => {
      console.warn(
        "[ZoriaGen] Auth not configured. Set NEXT_PUBLIC_PRIVY_APP_ID in .env.local to enable login."
      );
    },
    logout: () => {},
  };
  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

function PrivyAuthBridge({ children }: { children: ReactNode }) {
  const privy = usePrivy();
  const wallet = privy.user?.wallet;
  const value: AuthContextValue = {
    ready: privy.ready,
    authenticated: privy.authenticated,
    walletAddress: wallet?.address ?? null,
    login: privy.login,
    logout: privy.logout,
  };
  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within Providers");
  }
  return ctx;
}

export { MockAuthProvider, PrivyAuthBridge };
