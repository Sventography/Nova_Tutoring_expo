// context/UserContext.tsx
// Shim to keep older imports working: "../../context/UserContext"
// - If app/_providers/UserProvider exists, we proxy to it
// - Otherwise we provide a safe fallback that never crashes

import React, { createContext, useContext, PropsWithChildren } from "react";

export type UserShape = {
  username?: string;
  name?: string;
  displayName?: string;
  coins?: number;
  balance?: number;
  avatar?: string;
  avatarUrl?: string;
  email?: string;
  user?: any; // allow nested user objects from real provider
};

const FallbackUserContext = createContext<UserShape | null>(null);

function getRealProvider() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("../app/_providers/UserProvider");
    return {
      ProviderComp: mod.UserProvider ?? mod.default ?? null,
      useHook: mod.useUser ?? mod.useAuth ?? null,
    };
  } catch {
    return { ProviderComp: null, useHook: null };
  }
}

export const UserContext = FallbackUserContext;

export function useUserContext(): UserShape {
  const { useHook } = getRealProvider();
  if (typeof useHook === "function") {
    try {
      const u = useHook();
      return (u as UserShape) || {};
    } catch {}
  }
  return useContext(FallbackUserContext) ?? {};
}

// Alias so `import { useUser } from "../context/UserContext"` works everywhere
export function useUser(): UserShape {
  return useUserContext();
}

export function UserProvider({ children }: PropsWithChildren) {
  const { ProviderComp } = getRealProvider();
  if (ProviderComp) {
    return <ProviderComp>{children}</ProviderComp>;
  }
  return <FallbackUserContext.Provider value={{}}>{children}</FallbackUserContext.Provider>;
}

export default UserContext;
