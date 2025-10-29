import React, { createContext, useContext, useEffect, useState } from "react";
import * as api from "../_lib/api";

type User = {
  id: number; email: string; username: string;
  coins: number; questions_count: number; teasers_correct: number;
  avatar_url: string;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, confirm: string) => Promise<void>;
  forgot: (email: string) => Promise<{ reset_token?: string }>;
  reset: (token: string, password: string, confirm: string) => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (patch: { username?: string; avatar_url?: string }) => Promise<void>;
  logout: () => void;
  addCoins: (delta: number) => void;
};

const Ctx = createContext<AuthCtx>({
  user: null, loading: false,
  login: async () => {}, register: async () => {}, forgot: async () => ({}),
  reset: async () => {}, refresh: async () => {}, updateProfile: async () => {},
  logout: () => {}, addCoins: () => {},
});

export function useAuth() { return useContext(Ctx); }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    try {
      const r = await api.me();
      setUser(r.user);
    } catch {}
  }

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const r = await api.login(email, password);
      setUser(r.user);
    } finally { setLoading(false); }
  }

  async function register(email: string, username: string, password: string, confirm: string) {
    setLoading(true);
    try {
      const r = await api.register(email, username, password, confirm);
      setUser(r.user);
    } finally { setLoading(false); }
  }

  async function forgot(email: string) {
    const r = await api.forgot(email);
    return r;
  }

  async function reset(token: string, password: string, confirm: string) {
    await api.resetPassword(token, password, confirm);
  }

  async function updateProfile(patch: { username?: string; avatar_url?: string }) {
    const r = await api.updateMe(patch);
    setUser(r.user);
  }

  function logout() {
    api.setAuthToken(null);
    setUser(null);
  }

  function addCoins(delta: number) {
    if (!delta) return;
    setUser((u) => (u ? { ...u, coins: u.coins + delta } : u));
  }

  useEffect(() => {
    // Try to load /me on mount (no persistence for simplicity)
    refresh();
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, login, register, forgot, reset, refresh, updateProfile, logout, addCoins }}>
      {children}
    </Ctx.Provider>
  );
}

