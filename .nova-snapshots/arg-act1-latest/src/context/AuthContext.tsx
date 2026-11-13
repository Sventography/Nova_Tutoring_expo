import React, { createContext, useContext, useState } from "react";
type User = { id: string; email?: string } | null;
type Ctx = { user: User; signIn: (e: string, p: string) => Promise<void>; signUp: (e: string, p: string) => Promise<void>; signOut: () => Promise<void>; };
const AuthCtx = createContext<Ctx | undefined>(undefined);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const signIn = async (email: string, _p: string) => { setUser({ id: "u1", email }); };
  const signUp = async (email: string, _p: string) => { setUser({ id: "u1", email }); };
  const signOut = async () => { setUser(null); };
  return <AuthCtx.Provider value={{ user, signIn, signUp, signOut }}>{children}</AuthCtx.Provider>;
}
export function useAuth() {
  const v = useContext(AuthCtx);
  if (!v) throw new Error("AuthProvider missing");
  return v;
}
export default AuthProvider;
