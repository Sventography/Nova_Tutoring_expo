import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // important: need raw body access

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const rawBody = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Get the SKU you set in metadata when creating the session
        const sku = (session.metadata?.sku || "").toString();

        // Here you can:
        // - mark order paid in your DB
        // - send email
        // - issue license / entitlement server-side
        // - later your app can fetch entitlements from your backend

        console.log("✅ checkout.session.completed for sku:", sku, " session:", session.id);
        break;
      }

      // handle other events you care about:
      // case "charge.refunded": ...
      // case "payment_intent.succeeded": ...

      default:
        // no-op
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook handler error", err);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }
}
