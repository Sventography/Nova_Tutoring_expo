const express = require("express");
const Stripe = require("stripe");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

app.post("/create-checkout-session", async (req, res) => {
  try {
    const { priceId, quantity = 1 } = req.body;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity }],
      success_url: "http://localhost:8081/shop?status=success",
      cancel_url: "http://localhost:8081/shop?status=cancel",
    });
    res.json({ sessionId: session.id });
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log("Stripe backend on :" + PORT));
