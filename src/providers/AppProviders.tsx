import React from "react";

// ✅ Coins MUST be the outermost wrapper
import { CoinsProvider } from "../context/CoinsContext";

// The rest of your providers
import { ThemeProvider } from "../context/ThemeContext";
import { WalletProvider } from "../context/WalletContext";
import { NotifProvider } from "../context/NotifContext";

// 👇 These were present in your stack trace — keep them INSIDE CoinsProvider
import { AuthProvider } from "../context/AuthContext";
import { FxProvider } from "../context/FxProvider";
import { UserProvider } from "../context/UserContext";
import { AchievementsProvider } from "../context/AchievementsContext";
import { CollectionsProvider } from "../context/CollectionsContext";
import { CertificatesProvider } from "../context/CertificatesContext";
import { CommerceProvider } from "../context/CommerceContext";
import { ToastProvider } from "../context/ToastContext";

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <CoinsProvider>
      <AuthProvider>
        <FxProvider>
          <UserProvider>
            <ThemeProvider>
              <WalletProvider>
                <NotifProvider>
                  <AchievementsProvider>
                    <CollectionsProvider>
                      <CertificatesProvider>
                        <CommerceProvider>
                          <ToastProvider>
                            {children}
                          </ToastProvider>
                        </CommerceProvider>
                      </CertificatesProvider>
                    </CollectionsProvider>
                  </AchievementsProvider>
                </NotifProvider>
              </WalletProvider>
            </ThemeProvider>
          </UserProvider>
        </FxProvider>
      </AuthProvider>
    </CoinsProvider>
  );
};
