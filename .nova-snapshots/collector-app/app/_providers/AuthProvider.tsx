// app/_providers/AuthProvider.tsx
// Legacy compatibility shim.
// The real auth system now lives in app/context/UserContext.tsx.

import React from "react";
import { useUser } from "../context/UserContext";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // No separate provider anymore.
  // AppProviders/UserProvider handles the real auth state.
  return <>{children}</>;
}

export function useAuth() {
  const userCtx = useUser();

  const legacyUser = userCtx.user
    ? {
        ...userCtx.user,
        id: userCtx.user.id,
        email: userCtx.contactEmail ?? "",
        username: userCtx.username ?? userCtx.name ?? "Student",
        name: userCtx.name ?? userCtx.username ?? "Student",
        avatarUrl: userCtx.avatarUrl ?? userCtx.avatar ?? undefined,
        avatar_url: userCtx.avatarUrl ?? userCtx.avatar ?? undefined,

        // Old provider expected these sometimes
        coins: 0,
        questions_count: 0,
        teasers_correct: 0,
      }
    : null;

  async function login(email: string, password: string) {
    await userCtx.loginWithEmailPassword(email, password);
    return userCtx.user as any;
  }

  async function register(
    email: string,
    username: string,
    password: string,
    confirm?: string
  ) {
    if (confirm != null && password !== confirm) {
      throw new Error("Passwords do not match.");
    }

    await userCtx.signUpWithEmailPassword(username, email, password);
    return userCtx.user as any;
  }

  async function signUp(email: string, password: string, username?: string) {
    await userCtx.signUpWithEmailPassword(username || "Student", email, password);
    return userCtx.user as any;
  }

  async function requestReset(email: string) {
    await userCtx.resetPassword(email);
    return undefined;
  }

  async function forgot(email: string) {
    await userCtx.resetPassword(email);
    return {};
  }

  async function reset(_token: string, password: string, confirm?: string) {
    if (confirm != null && password !== confirm) {
      throw new Error("Passwords do not match.");
    }

    await userCtx.updatePassword(password);
  }

  async function refresh() {
    // UserContext hydrates itself through Supabase.
    return;
  }

  async function updateProfile(patch: {
    username?: string;
    avatar_url?: string;
    avatarUrl?: string;
    name?: string;
  }) {
    await userCtx.updateProfile({
      username: patch.username ?? patch.name,
      name: patch.name ?? patch.username,
      displayName: patch.name ?? patch.username,
      avatar: patch.avatar_url ?? patch.avatarUrl,
      avatarUrl: patch.avatar_url ?? patch.avatarUrl,
      avatarUri: patch.avatar_url ?? patch.avatarUrl,
      photoURL: patch.avatar_url ?? patch.avatarUrl,
      imageUrl: patch.avatar_url ?? patch.avatarUrl,
    });
  }

  async function logout() {
    await userCtx.signOut();
  }

  function addCoins(_delta: number) {
    // Coins are handled by CoinsContext now.
  }

  return {
    ...userCtx,

    // Legacy user shape
    user: legacyUser,

    // Common legacy fields
    loading: !userCtx.ready,
    ready: userCtx.ready,
    session: userCtx.session,
    isLoggedIn: userCtx.isLoggedIn,

    // Legacy auth aliases
    login,
    signIn: userCtx.loginWithEmailPassword,
    signInWithEmailPassword: userCtx.loginWithEmailPassword,
    loginWithEmailPassword: userCtx.loginWithEmailPassword,

    register,
    signUp,
    signUpWithEmailPassword: userCtx.signUpWithEmailPassword,

    requestReset,
    forgot,
    reset,
    resetPassword: userCtx.resetPassword,
    updatePassword: userCtx.updatePassword,

    refresh,
    updateProfile,

    logout,
    signOut: userCtx.signOut,

    addCoins,
  };
}