const StripeSDK = require("stripe").default ?? require("stripe");
import { ENV } from "../../config/env";

if (!ENV.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is missing in environment variables");
}

// Bypass the @types/stripe namespace conflict entirely using require
// The old @types/stripe redefines Stripe as a namespace not a class,
// which breaks `new Stripe()` and `Stripe.Checkout` under NodeNext resolution
const stripe = new StripeSDK(ENV.STRIPE_SECRET_KEY, {
  apiVersion: "2026-04-22.dahlia",
});

export { stripe };

export const stripeService = {
  // Create a new Stripe Checkout session
  createSession: async (
    lineItems: {
      price_data: {
        currency: string;
        product_data: { name: string; description?: string };
        unit_amount: number;
      };
      quantity: number;
    }[],
    userId: string,
    orderId: string
  ) => {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        // Redirecting to success page with session_id for client-side confirmation
        success_url: `${ENV.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        // Redirecting back to cart if user cancels the payment process
        cancel_url: `${ENV.FRONTEND_URL}/cart`,
        // Include metadata to track user and order in Stripe Webhooks
        metadata: { 
          userId: userId, 
          orderId: orderId 
        },
      });

      return session;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Stripe Session Error:", msg);
      throw new Error(`Stripe Error: ${msg}`);
    }
  },

  // Retrieve and verify a specific payment session by its ID
  verifySession: async (sessionId: string) => {
    try {
      return await stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Stripe Verification Error:", msg);
      throw new Error(`Stripe Verification Error: ${msg}`);
    }
  },
};