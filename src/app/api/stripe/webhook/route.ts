import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { planIsActive } from "@/lib/plans";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook. Point a Stripe endpoint at POST /api/stripe/webhook and
 * subscribe to: checkout.session.completed, customer.subscription.created,
 * customer.subscription.updated, customer.subscription.deleted.
 *
 * It keeps each user's plan / subscriptionStatus / period end in sync so plan
 * gating in the app reflects reality.
 */
async function syncFromSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
  if (!user) return;

  const active = planIsActive(sub.status);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: active ? "pro" : "free",
      subscriptionStatus: sub.status,
      stripeSubscriptionId: sub.id,
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
    },
  });
}

export async function POST(req: Request) {
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    if (!sig || !secret) throw new Error("Missing signature or webhook secret");
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "bad signature";
    return NextResponse.json({ error: `Webhook error: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncFromSubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncFromSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "handler error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
