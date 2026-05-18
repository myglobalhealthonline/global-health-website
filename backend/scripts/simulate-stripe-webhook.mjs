import "dotenv/config";
import Stripe from "stripe";

const aptId = process.argv[2];
if (!aptId) {
  console.error("Usage: node scripts/simulate-stripe-webhook.mjs <appointmentId>");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const secret = process.env.STRIPE_WEBHOOK_SECRET;
if (!secret) {
  console.error("NO_SECRET");
  process.exit(2);
}

const sessionId = `cs_test_${Date.now()}`;
const eventId = `evt_test_${Date.now()}`;
const payload = JSON.stringify({
  id: eventId,
  object: "event",
  api_version: "2024-11-20.acacia",
  type: "checkout.session.completed",
  data: {
    object: {
      id: sessionId,
      object: "checkout.session",
      client_reference_id: aptId,
      payment_intent: "pi_test_webhook",
      amount_total: 3900,
      currency: "eur",
      metadata: { appointmentId: aptId },
    },
  },
});

const sig = stripe.webhooks.generateTestHeaderString({ payload, secret });
const res = await fetch("http://localhost:4000/api/payments/webhook", {
  method: "POST",
  headers: { "Content-Type": "application/json", "stripe-signature": sig },
  body: payload,
});
const text = await res.text();
console.log(`${res.status}|${text.slice(0, 240)}`);
