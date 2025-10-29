import React, { createContext, useContext, useState } from "react";
type User={ id:string; name?:string };
const Ctx=createContext<{ user:User; setUser:(u:User)=>void; notifyEvent:(_e:string)=>void }|undefined>(undefined);
export function UserProvider({ children }:{ children:any }){ const [user,setUser]=useState<User>({ id:"default" }); const notifyEvent=(_e:string)=>{}; return <Ctx.Provider value={{ user, setUser, notifyEvent }}>{children}</Ctx.Provider>; }
export function useUser(){ const v=useContext(Ctx); if(!v) throw new Error("UserProvider missing"); return v; }
