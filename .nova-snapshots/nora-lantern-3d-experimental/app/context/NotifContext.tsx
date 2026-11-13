import React from "react";
export const NotifContext = React.createContext({});
export const NotifProvider: React.FC<React.PropsWithChildren> = ({ children }) => <>{children}</>;
export default NotifProvider;
