import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { Platform } from "react-native";

export async function generateCertificatePDF({ studentName, topic, score }:{
  studentName: string; topic: string; score: number;
}) {
  const html = `
  <html><head><meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>body{background:#0b1622;color:#e6f7ff;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;padding:24px;}
  .wrap{border:4px solid #00e5ff;border-radius:12px;padding:24px;}
  h1{color:#00e5ff;text-align:center;} .big{font-size:22px;font-weight:800;color:#ffd43b}
  .topic{color:#8be9fd;font-weight:700} .center{text-align:center;margin-top:12px}
  </style></head><body>
  <div class="wrap">
    <h1>Certificate of Achievement</h1>
    <p class="center">This certifies that</p>
    <p class="center big">${studentName}</p>
    <p class="center">has successfully completed the quiz on</p>
    <p class="center topic">${topic}</p>
    <p class="center">with a score of ${score}%</p>
    <p class="center" style="margin-top:16px">Nova Tutoring</p>
  </div></body></html>`;
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync() && Platform.OS !== "web") {
    await Sharing.shareAsync(uri, { dialogTitle: "Share your certificate" });
  }
  return uri;
}
