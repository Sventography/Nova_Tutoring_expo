import express from "express";
import bodyParser from "body-parser";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2023-10-16" });
const app = express();
app.post("/stripe/webhook", bodyParser.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || "");
    switch (event.type) {
      case "checkout.session.completed":
        break;
      default:
        break;
    }
    res.json({ received: true });
  } catch {
    res.status(400).send(`Webhook Error`);
  }
});
const port = process.env.PORT || 4002;
app.listen(port, () => {});