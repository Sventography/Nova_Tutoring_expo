set -e

if ! command -v node >/dev/null; then echo "node missing"; exit 1; fi
if ! command -v npm >/dev/null; then echo "npm missing"; exit 1; fi

bad_native=$(grep -RIl '@stripe/stripe-react-native' app || true)
if [ -n "$bad_native" ]; then
  mkdir -p app/utils
  cat > app/utils/stripe.native.ts <<'EON'
export * from "@stripe/stripe-react-native";
export { default } from "@stripe/stripe-react-native";
EON
  cat > app/utils/stripe.web.ts <<'EOW'
import React from "react";
export const StripeProvider = ({ children }: any) => { return children; };
export const CardField = (_props: any) => null;
export const CardForm = (_props: any) => null;
export function useStripe() {
  return {
    confirmPayment: async (_cs: string, _p: any) => ({ error: undefined }),
    initPaymentSheet: async (_p: any) => ({ error: undefined }),
    presentPaymentSheet: async (_p?: any) => ({ error: undefined }),
    createPaymentMethod: async (_p: any) => ({ error: undefined }),
    handleNextAction: async (_cs: string) => ({ error: undefined }),
  };
}
export default { StripeProvider, CardField, CardForm, useStripe };
EOW
  find app -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -print0 | xargs -0 sed -i '' "s#'@stripe/stripe-react-native'#'../utils/stripe'#g"
  find app -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -print0 | xargs -0 sed -i '' "s#\"@stripe/stripe-react-native\"#\"../utils/stripe\"#g"
fi

if ! npm ls eventemitter3 >/dev/null 2>&1; then npm i eventemitter3; fi
if grep -RIl 'from "events"' app >/dev/null 2>&1; then
  cat > app/lib/bus.ts <<'EOB'
import EventEmitter from "eventemitter3";
const bus = new EventEmitter();
export default bus;
EOB
  for f in $(grep -RIl 'from "events"' app); do
    sed -i '' 's/from "events"/from "eventemitter3"/g' "$f"
    sed -i '' 's/import[[:space:]]*{[[:space:]]*EventEmitter[[:space:]]*}[[:space:]]*from[[:space:]]*"eventemitter3"/import EventEmitter from "eventemitter3"/g' "$f"
  done
fi

mkdir -p styles
if [ ! -f styles/global.css ]; then
  cat > styles/global.css <<'EOC'
html.use-custom-cursor,
html.use-custom-cursor * { cursor: var(--app-cursor, auto) !important; }
EOC
fi

mkdir -p app
cat > app/_layout.web.tsx <<'EOL'
import "../styles/global.css";
export { default } from "./_layout";
EOL

if [ ! -f .env.development ]; then
  cat > .env.development <<'EOE'
EXPO_PUBLIC_API_URL=http://127.0.0.1:5050
EOE
fi

cat > app/providers/ThemeBridge.tsx <<'EOT'
import React, { createContext, useContext } from "react";
type ThemePalette = { bg: string; text: string; primary: string; secondary: string; accent: string; border: string; muted: string; danger: string; };
const DEFAULT_PALETTE: ThemePalette = { bg: "#030712", text: "#e5faff", primary: "#00e5ff", secondary: "#7dd3fc", accent: "#22d3ee", border: "rgba(34,211,238,0.4)", muted: "rgba(255,255,255,0.4)", danger: "#ef4444" };
const Ctx = createContext<ThemePalette>(DEFAULT_PALETTE);
export default function ThemeBridgeProvider({ children, palette }: { children: React.ReactNode; palette?: Partial<ThemePalette> }) {
  const merged: ThemePalette = { ...DEFAULT_PALETTE, ...(palette || {}) };
  return <Ctx.Provider value={merged}>{children}</Ctx.Provider>;
}
export function useThemeColors() { return useContext(Ctx); }
EOT

cat > app/_layout.tsx <<'EOL2'
import React from "react";
import { Slot } from "expo-router";
import { ThemeProvider } from "./context/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import PreloadGate from "./utils/preload";
import CheckInGate from "./components/CheckInGate";
import RootCursorLayer from "../components/RootCursorLayer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import ThemeBridgeProvider from "./providers/ThemeBridge";
export const unstable_settings = { initialRouteName: "(tabs)" };
export default function Root() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ThemeBridgeProvider>
          <ErrorBoundary>
            <PreloadGate>
              <CheckInGate>
                <RootCursorLayer />
                <Slot />
              </CheckInGate>
            </PreloadGate>
          </ErrorBoundary>
        </ThemeBridgeProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
EOL2

if [ ! -f components/RootCursorLayer.tsx ]; then
  mkdir -p components
  cat > components/RootCursorLayer.tsx <<'EOR'
import React from "react";
export default function RootCursorLayer() { return null; }
EOR
fi

npx expo install expo-constants expo-linking react-native-gesture-handler
npx expo start -c
