import React from "react";

type NotifAPI = { notify: (msg: string) => void };
export const NotifContext = React.createContext<NotifAPI>({ notify: () => {} });

export default function NotifProvider({ children }: { children: React.ReactNode }) {
  const notify = (msg: string) => { try { console.log("[notif]", msg); } catch {} };
  return <NotifContext.Provider value={{ notify }}>{children}</NotifContext.Provider>;
}

export const useNotif = () => React.useContext(NotifContext);
