import React,{createContext,useContext,useMemo,useState} from 'react';
type User={email:string}|null;
type AuthCtx={user:User;register:(e:string,p:string)=>Promise<void>;login:(e:string,p:string)=>Promise<void>;logout:()=>Promise<void>;};
const Ctx=createContext<AuthCtx|undefined>(undefined);
export function AuthProvider({children}:{children:React.ReactNode}){
  const [user,setUser]=useState<User>(null);
  const register=async(e:string,p:string)=>{setUser({email:e});};
  const login=async(e:string,p:string)=>{setUser({email:e});};
  const logout=async()=>{setUser(null);};
  const value=useMemo(()=>({user,register,login,logout}),[user]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useAuth(){
  const v=useContext(Ctx);
  if(!v) throw new Error('useAuth must be used within <AuthProvider>');
  return v;
}
