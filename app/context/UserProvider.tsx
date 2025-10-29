import React from "react";
type User={ name?:string; avatarUri?:string };
type API={ user:User; setUser:(u:User)=>void };
const Ctx=React.createContext<API>({ user:{}, setUser:()=>{} });
export default function UserProvider({children}:{children:React.ReactNode}) {
  const [user,setUser]=React.useState<User>({});
  return <Ctx.Provider value={{user,setUser}}>{children}</Ctx.Provider>;
}
export const useUser=()=>React.useContext(Ctx);
