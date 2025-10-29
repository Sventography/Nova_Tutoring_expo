import React, { createContext, useContext, useState } from "react";
type User = any;
type Ctx = { user: User; setUser: (u: User) => void };
const AuthContext = createContext<Ctx>({ user: null, setUser: () => {} });
export function useAuth(){ return useContext(AuthContext); }
export default function AuthProvider({ children }: { children?: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  return <AuthContext.Provider value={{ user, setUser }}>{children}</AuthContext.Provider>;
}
