import React from "react";

/** Common props for all providers */
type P = { children: React.ReactNode };

/** Passthrough wrapper to keep app booting if a provider is missing */
const Pass: React.FC<P> = ({ children }) => <>{children}</>;

/** Resolve a component from a module by trying candidate export names */
function resolve(mod: any, candidates: string[]) {
  for (const k of candidates) {
    const C = k === "default" ? mod?.default : mod?.[k];
    if (typeof C === "function") return C;
  }
  return undefined;
}

/** Wrap resolution with logging + safe fallback */
function safe(mod: any, label: string, candidates: string[]) {
  const C = resolve(mod, candidates);
  if (typeof C === "function") {
    // visible once in console so you can see what actually resolved
    try { console.log(`[providers] ${label} -> ${C.name || "anon"}`); } catch {}
    return C as React.ComponentType<P>;
  }
  try { console.warn(`[providers] ${label} is undefined → using passthrough`); } catch {}
  return Pass;
}

/* ===== Namespace imports (static, bundler-safe) =====
   These tolerate either default or named exports in your files. */
import * as ThemeMod         from "./context/ThemeProvider";
import * as WalletMod        from "./context/WalletProvider";
import * as NotifMod         from "./context/NotifProvider";
import * as CoinsMod         from "./context/CoinsContext";
import * as ToastMod         from "./context/ToastContext";
import * as UserMod          from "./context/UserProvider";
import * as UserCtxMod       from "./context/UserContext";
import * as CommerceMod      from "./context/CommerceContext";
import * as CertificatesMod  from "./context/CertificatesContext";
import * as CollectionsMod   from "./context/CollectionsContext";
import * as AchvCtxMod       from "./context/AchievementsContext";
import * as AchvEngMod       from "./context/AchievementEngineContext";

/* ===== Safe exports (never undefined) ===== */
export const ThemeProvider        = safe(ThemeMod,        "ThemeProvider",        ["default","ThemeProvider","themeProvider"]);
export const WalletProvider       = safe(WalletMod,       "WalletProvider",       ["default","WalletProvider","walletProvider"]);
export const NotifProvider        = safe(NotifMod,        "NotifProvider",        ["default","NotifProvider","notifProvider","NotificationProvider"]);

export const CoinsProvider        = safe(CoinsMod,        "CoinsProvider",        ["default","CoinsProvider","coinsProvider"]);
export const ToastProvider        = safe(ToastMod,        "ToastProvider",        ["default","ToastProvider","toastProvider"]);
export const UserProvider         = safe(UserMod,         "UserProvider",         ["default","UserProvider","userProvider"]);
export const UserProviderAlt      = safe(UserCtxMod,      "UserProvider(UserContext)", ["UserProvider","default"]); // either export style

export const CommerceProvider     = safe(CommerceMod,     "CommerceProvider",     ["default","CommerceProvider","commerceProvider"]);
export const CertificatesProvider = safe(CertificatesMod, "CertificatesProvider", ["default","CertificatesProvider","certificatesProvider"]);
export const CollectionsProvider  = safe(CollectionsMod,  "CollectionsProvider",  ["default","CollectionsProvider","collectionsProvider"]);

/* Achievements: prefer AchievementsContext, fall back to AchievementEngineContext */
const AchievementsFromCtx = safe(AchvCtxMod, "AchievementsProvider(AchievementsContext)", ["default","AchievementsProvider","achievementsProvider"]);
export const AchievementsProvider =
  AchievementsFromCtx !== Pass
    ? AchievementsFromCtx
    : safe(AchvEngMod, "AchievementsProvider(AchievementEngineContext)", ["default","AchievementsProvider","achievementsProvider"]);

