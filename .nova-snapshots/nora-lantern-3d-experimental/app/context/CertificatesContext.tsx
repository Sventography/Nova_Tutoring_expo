import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

type CertInput = { subject: string; scorePct: number; name?: string };
type CertAPI = { generateCertificate: (i: CertInput) => Promise<string>; lastUri?: string|null };

const Ctx = createContext<CertAPI | null>(null);

export function CertificatesProvider({ children }: { children: React.ReactNode }) {
  const [lastUri, setLastUri] = useState<string | null>(null);

  const generateCertificate = useCallback(async ({ subject, scorePct, name }: CertInput) => {
    const title = "Certificate of Achievement";
    const person = name || "Student";
    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial; padding: 48px; }
            .card { border: 4px solid #00E5FF; border-radius: 16px; padding: 40px; text-align: center; }
            h1 { margin: 0 0 8px 0; font-size: 28px; color: #0B2239; }
            h2 { margin: 8px 0 24px 0; color: #00A9C7; }
            .meta { color: #333; font-size: 16px; }
            .big { font-size: 22px; font-weight: 800; color: #0B2239; margin: 16px 0; }
            .line { margin-top: 32px; height: 2px; background: #00E5FF; }
            .foot { margin-top: 16px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${title}</h1>
            <div class="big">${person}</div>
            <div class="meta">has demonstrated excellence in</div>
            <h2>${subject}</h2>
            <div class="meta">with a score of <b>${scorePct}%</b></div>
            <div class="line"></div>
            <div class="foot">${new Date().toLocaleString()}</div>
          </div>
        </body>
      </html>
    `;
    const { uri } = await Print.printToFileAsync({ html });
    setLastUri(uri);
    try { if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri); } catch {}
    return uri;
  }, []);

  const value = useMemo<CertAPI>(() => ({ generateCertificate, lastUri }), [generateCertificate, lastUri]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCertificates() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCertificates must be used inside CertificatesProvider");
  return ctx;
}
