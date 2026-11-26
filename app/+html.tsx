import React, { type PropsWithChildren } from "react";
import { ScrollViewStyleReset } from "expo-router/html";

// Expo Router SDK 54 static web document. Keep the default native-like scroll reset.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        {process.env.EXPO_PUBLIC_ISOLATED_PREVIEW === "true" && (
          <meta httpEquiv="Content-Security-Policy"
            content="connect-src 'self' blob: data: https://gouhhltupxaycuysdtrw.supabase.co wss://gouhhltupxaycuysdtrw.supabase.co" />
        )}
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>Nova Tutoring</title>
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
