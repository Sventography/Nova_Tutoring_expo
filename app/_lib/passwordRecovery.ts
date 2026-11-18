// Keep browser recovery in the browser; native builds retain their HTTPS/app bridge.
export function passwordRecoveryRedirect({
  platform,
  browserOrigin,
  webRedirect,
  nativeRedirect,
}: {
  platform: string;
  browserOrigin?: string;
  webRedirect?: string;
  nativeRedirect: string;
}): string {
  if (platform !== "web") return nativeRedirect;

  const configured = webRedirect?.trim();
  const destination = configured || (browserOrigin ? `${browserOrigin}/auth/callback` : "");
  if (!destination) throw new Error("Open the sign-in page in your browser to reset your password.");

  let url: URL;
  try {
    url = new URL(destination);
  } catch {
    throw new Error("Password reset is not configured for this website. Please contact support.");
  }
  const localDevelopment = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if ((url.protocol !== "https:" && !localDevelopment) || url.username || url.password ||
      url.pathname !== "/auth/callback" || url.search || url.hash) {
    throw new Error("Password reset is not configured for this website. Please contact support.");
  }
  return url.href;
}
