import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "you@example.com";

type Payload = {
  id: string;
  sku: string;
  title: string;
  createdAt: number;
  status: "paid" | "fulfilled" | "shipped";
  size?: string | null;
  category?: string;
  coinsPrice?: number;
  name?: string;
  email?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

function formatLines(o: Payload) {
  const dt = new Date(o.createdAt).toLocaleString();
  return [
    `Order ID: ${o.id}`,
    `Item: ${o.title} (${o.sku})`,
    `Category: ${o.category ?? "-"}`,
    `Coins Price: ${o.coinsPrice ?? 0}`,
    `Status: ${o.status}`,
    `Size: ${o.size ?? "-"}`,
    `Placed: ${dt}`,
    "",
    "Ship to:",
    `${o.name ?? "-"}`,
    `${o.address1 ?? "-"} ${o.address2 ?? ""}`.trim(),
    `${o.city ?? "-"}, ${o.state ?? "-"} ${o.postalCode ?? "-"}`,
    `${o.country ?? "-"}`,
    "",
    `Customer Email: ${o.email ?? "-"}`,
  ].join("<br/>");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*"); // or "http://localhost:8081"
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");

  if (req.method === "OPTIONS") return res.status(204).end();
  // --------------

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const payload = req.body as Payload;
  if (!payload || !payload.id || !payload.title) {
    return res.status(400).json({ ok: false, error: "Invalid payload" });
  }

  const html = `<div style="font-family: ui-sans-serif, system-ui, -apple-system;">
    <h2>Order Confirmation</h2>
    <p>Thanks for your order! Below are the details:</p>
    <div style="padding:12px;border:1px solid #eee;border-radius:8px;background:#fafafa">
      ${formatLines(payload)}
    </div>
  </div>`;

  const adminHtml = `<div style="font-family: ui-sans-serif, system-ui, -apple-system;">
    <h2>New Order Received</h2>
    <p>Please fulfill this order:</p>
    <div style="padding:12px;border:1px solid #eee;border-radius:8px;background:#fafafa">
      ${formatLines(payload)}
    </div>
  </div>`;

  try {
    if (payload.email) {
      await resend.emails.send({
        from: "Nova Shop <orders@yourdomain.com>",
        to: payload.email,
        subject: `Your Nova order ${payload.id}`,
        html,
      });
    }

    await resend.emails.send({
      from: "Nova Shop <orders@yourdomain.com>",
      to: ADMIN_EMAIL,
      subject: `NEW ORDER: ${payload.title} — ${payload.id}`,
      html: adminHtml,
    });

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("[order-email] send failed:", e?.message || e);
    return res.status(500).json({ ok: false, error: "Send failed" });
  }
}
