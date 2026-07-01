import Stripe from "stripe";

export const stripe: Stripe | null = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

/** True only when we have both a secret key and a price to sell. */
export function stripeConfigured(): boolean {
  return !!stripe && !!process.env.STRIPE_PRICE_ID;
}
