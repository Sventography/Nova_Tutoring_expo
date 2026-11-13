import React from "react";

let TP: any = ({ children }: any) => <>{children}</>;
let WP: any = ({ children }: any) => <>{children}</>;
let AP: any = ({ children }: any) => <>{children}</>;
try {
  TP = require("@components/Toast").ToastProvider ?? TP;
} catch {}
try {
  WP = require("@/context/WalletContext").WalletProvider ?? WP;
} catch {}
try {
  AP = require("@/context/AchievementsContext").AchievementsProvider ?? AP;
} catch {}
export const ToastProvider = TP;
export const WalletProvider = WP;
export const AchievementsProvider = AP;
