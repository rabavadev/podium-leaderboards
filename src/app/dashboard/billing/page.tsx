import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { stripeConfigured } from "@/lib/stripe";
import { startCheckoutAction, openPortalAction } from "@/lib/actions";
import { PLANS, planIsActive } from "@/lib/plans";
import { DashNav } from "@/components/DashNav";

export const dynamic = "force-dynamic";

export default async function BillingPage({ searchParams }: { searchParams: { success?: string; canceled?: string; limit?: string; error?: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const active = planIsActive(user.subscriptionStatus) && user.plan === "pro";
  const configured = stripeConfigured();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <DashNav email={user.email} plan={user.plan} isPlatformAdmin={user.isPlatformAdmin} />
      <h1 className="mb-2 text-2xl font-extrabold text-white">Billing</h1>
      <p className="mb-6 text-sm text-slate-500">
        Current plan: <b className="text-slate-300">{active ? "Pro" : "Free"}</b>
        {user.currentPeriodEnd && active ? ` · renews ${new Date(user.currentPeriodEnd).toLocaleDateString()}` : ""}
      </p>

      {searchParams.success ? (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-300">
          Subscription active. Welcome to Pro 🎉 (May take a few seconds to reflect while Stripe confirms.)
        </div>
      ) : null}
      {searchParams.limit ? (
        <div className="mb-6 rounded-xl border border-gold-500/30 bg-gold-500/5 p-4 text-sm text-slate-300">
          You reached the Free plan board limit. Upgrade to Pro for unlimited leaderboards.
        </div>
      ) : null}
      {searchParams.error === "stripe" ? (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
          Billing isn&apos;t configured yet. Add your Stripe keys to enable subscriptions.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {(["free", "pro"] as const).map((id) => {
          const plan = PLANS[id];
          const isCurrent = id === "pro" ? active : !active;
          return (
            <div key={id} className={`card p-6 ${id === "pro" ? "ring-1 ring-gold-500/40" : ""}`}>
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-bold text-white">{plan.name}</h2>
                <span className="text-sm text-slate-400">{plan.price}</span>
              </div>
              <ul className="mt-4 space-y-1.5 text-sm text-slate-400">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-gold-400">✓</span>{f}</li>
                ))}
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  <span className="btn-ghost w-full cursor-default text-sm">Current plan</span>
                ) : id === "pro" ? (
                  <form action={startCheckoutAction}>
                    <button className="btn-gold w-full" type="submit" disabled={!configured}>
                      {configured ? "Upgrade to Pro" : "Stripe not configured"}
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {active ? (
        <form action={openPortalAction} className="mt-6">
          <button className="btn-ghost text-sm" type="submit">Manage subscription / invoices →</button>
        </form>
      ) : null}

      {!configured ? (
        <p className="mt-8 text-xs text-slate-600">
          Operator note: set STRIPE_SECRET_KEY, STRIPE_PRICE_ID and STRIPE_WEBHOOK_SECRET in your environment to turn on billing.
        </p>
      ) : null}
    </main>
  );
}
