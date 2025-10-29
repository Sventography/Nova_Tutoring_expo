import React, { createContext, useContext, useState } from "react";

type User = { username: string; avatar?: string };
type UserContextType = {
  user: User;
  setUser: (u: User) => void;
};

const UserContext = createContext<UserContextType | null>(null);
export const useUser = () => useContext(UserContext)!;

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>({ username: "Guest" });
  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}
