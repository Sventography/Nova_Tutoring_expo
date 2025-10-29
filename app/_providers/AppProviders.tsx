// app/_providers/AppProviders.tsx
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

type FCWC = React.FC<React.PropsWithChildren>;
const Noop: FCWC = ({ children }) => <>{children}</>;

/** Helper to pick a provider from a statically imported module */
const pick = (m: any, ...keys: string[]): FCWC =>
  (keys.find((k) => m?.[k]) && (m as any)[keys.find((k) => m?.[k])!]) ||
  (m?.default as FCWC) ||
  Noop;

/* ------- STATIC imports (paths corrected to ../context/*) ------- */
// If any of these files are named slightly differently in your repo,
// just tweak the import path, not the rest of this file.
import * as ThemeMod        from "../context/ThemeContext";
import * as FxMod           from "../context/FxProvider";
import * as CoinsMod        from "../context/CoinsContext";
import * as StreakMod       from "../context/StreakContext";
import * as WalletMod       from "../context/WalletContext";
import * as NotifMod        from "../context/NotifContext";
import * as ToastMod        from "../context/ToastContext";
import * as CollectionsMod  from "../context/CollectionsContext";
import * as AchievementsMod from "../context/AchievementsContext";
import * as SettingsMod     from "../context/SettingsContext";
import * as UserMod         from "../context/UserContext";
import * as CommerceMod     from "../context/CommerceContext";      // aka ShopCommerceContext in some repos
import * as QuizMod         from "../context/QuizContext";
// If you also have Auth, uncomment these two lines:
// import * as AuthMod         from "../context/AuthContext";

/* ------- Resolve actual components (or Noop fallbacks) ------- */
const ThemeProvider        = pick(ThemeMod,        "ThemeProvider");
const FxProvider           = pick(FxMod,           "FxProvider");
const CoinsProvider        = pick(CoinsMod,        "CoinsProvider");
const StreakProvider       = pick(StreakMod,       "StreakProvider");
const WalletProvider       = pick(WalletMod,       "WalletProvider");
const NotifProvider        = pick(NotifMod,        "NotifProvider");
const ToastProvider        = pick(ToastMod,        "ToastProvider");
const CollectionsProvider  = pick(CollectionsMod,  "CollectionsProvider");
const AchievementsProvider = pick(AchievementsMod, "AchievementsProvider");
const SettingsProvider     = pick(SettingsMod,     "SettingsProvider");
const UserProvider         = pick(UserMod,         "UserProvider");

// Support both names for commerce provider
const CommerceProvider     = pick(CommerceMod,     "CommerceProvider", "ShopCommerceProvider");

// If you have Auth, uncomment this:
// const AuthProvider         = pick(AuthMod,         "AuthProvider");

const QuizProvider         = pick(QuizMod,         "QuizProvider");

export default function AppProviders({ children }: React.PropsWithChildren) {
  return (
    <SafeAreaProvider>
      {/* If you use Auth, wrap everything with it here */}
      {/* <AuthProvider> */}
        <ThemeProvider>
          <ToastProvider>
            <NotifProvider>
              <UserProvider>
                <WalletProvider>
                  <FxProvider>
                    {/* CoinsProvider wraps children so useCoins() is always safe */}
                    <CoinsProvider>
                      <CommerceProvider>
                        <CollectionsProvider>
                          <AchievementsProvider>
                            <QuizProvider>
                              <SettingsProvider>{children}</SettingsProvider>
                            </QuizProvider>
                          </AchievementsProvider>
                        </CollectionsProvider>
                      </CommerceProvider>
                    </CoinsProvider>
                  </FxProvider>
                </WalletProvider>
              </UserProvider>
            </NotifProvider>
          </ToastProvider>
        </ThemeProvider>
      {/* </AuthProvider> */}
    </SafeAreaProvider>
  );
}
