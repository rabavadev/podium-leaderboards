import Stripe from "stripe";

let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client) client = new Stripe(key, { apiVersion: "2023-10-16" as any });
  return client;
}

export function stripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_PRO_PRICE_ID;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export const PRO_PLAN = "pro";

/** Max boards allowed per plan. */
export function boardLimit(plan: string): number {
  return plan === PRO_PLAN ? 999 : 1;
}
