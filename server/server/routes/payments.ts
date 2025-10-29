import { Router } from "express";
import Stripe from "stripe";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: "2024-06-20" });

/**
 * Creates a PaymentIntent (kept for future PaymentSheet/native flows).
 * body: { amount: number, currency?: string }
 */
router.post("/intent", async (req, res) => {
  try {
    const { amount, currency = "usd" } = req.body ?? {};
    if (!amount || amount < 50) return res.status(400).json({ ok: false, error: "Invalid amount" });

    const intent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
    });

    return res.json({ ok: true, clientSecret: intent.client_secret });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? "Stripe error" });
  }
});

/**
 * Creates a Stripe Checkout Session and returns { url }.
 * body: { name: string, amount: number, currency?: string, quantity?: number,
 *         success_url?: string, cancel_url?: string }
 */
router.post("/checkout", async (req, res) => {
  try {
    const {
      name = "Nova Item",
      amount, // in cents
      currency = "usd",
      quantity = 1,
      success_url = "https://checkout.stripe.dev/success",
      cancel_url = "https://checkout.stripe.dev/cancel"
    } = req.body ?? {};

    if (!amount || amount < 50) {
      return res.status(400).json({ ok: false, error: "Invalid amount (min $0.50)" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity,
          price_data: {
            currency,
            product_data: { name },
            unit_amount: amount
          }
        }
      ],
      success_url,
      cancel_url
    });

    return res.json({ ok: true, url: session.url });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? "Stripe error" });
  }
});

export default router;
