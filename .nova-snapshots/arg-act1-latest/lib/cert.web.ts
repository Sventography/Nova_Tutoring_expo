export async function generateCertificatePDF(_opts: {
  studentName: string; topic: string; score: number; certId: string; qrData?: string;
}) {
  // On web we can either return null or build an HTML for the user to print.
  // Keeping it simple: inform caller not supported.
  console.warn("generateCertificatePDF is not supported on Web in this build.");
  return null;
}
