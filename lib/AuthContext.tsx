import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';

type AuthCtx = { user: User|null; loading: boolean;
  register: (email:string,pw:string)=>Promise<void>;
  login: (email:string,pw:string)=>Promise<void>;
  logout: ()=>Promise<void>;
};
const Ctx = createContext<AuthCtx|null>(null);

export function AuthProvider({children}:{children:React.ReactNode}) {
  const [user,setUser]=useState<User|null>(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>onAuthStateChanged(auth,u=>{setUser(u);setLoading(false);}),[]);
  const value = useMemo(()=>({
    user, loading,
    async register(email,pw){ await createUserWithEmailAndPassword(auth,email.trim(),pw); },
    async login(email,pw){ await signInWithEmailAndPassword(auth,email.trim(),pw); },
    async logout(){ await signOut(auth); },
  }),[user,loading]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useAuth(){ const v=useContext(Ctx); if(!v) throw new Error('useAuth must be used within <AuthProvider>'); return v; }
