import React from "react";
type Settings = { sound:boolean; haptics:boolean };
export const SettingsContext = React.createContext<{ settings:Settings; setSettings:(s:Settings)=>void; }>({ settings:{ sound:true, haptics:true }, setSettings:()=>{} });
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<Settings>({ sound:true, haptics:true });
  return <SettingsContext.Provider value={{ settings, setSettings }}>{children}</SettingsContext.Provider>;
}
export function useSettings(){ return React.useContext(SettingsContext); }
