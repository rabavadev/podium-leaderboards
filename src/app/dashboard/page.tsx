import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createBoardAction, logoutAction, createCheckoutAction, createPortalAction } from "@/lib/actions";
import { stripeEnabled, boardLimit } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  plan_limit: "You've reached your plan's board limit. Upgrade to Pro to create more.",
  stripe_not_configured: "Payments aren't configured on this instance yet. Contact the host.",
  checkout_failed: "Checkout could not be started.",
  portal_failed: "Could not open the billing portal.",
};

export default async function DashboardPage({ searchParams }: { searchParams: { error?: string; upgrade?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const boards = await prisma.board.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { entries: true } } },
  });

  const limit = boardLimit(user.plan);
  const atLimit = !user.isHost && boards.length >= limit;
  const isPro = user.plan === "pro";

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">◆ Podium</h1>
          <p className="text-sm text-slate-500">
            Hi {user.name || user.email} · {user.isHost ? "Host" : isPro ? "Pro" : "Free"} plan
          </p>
        </div>
        <form action={logoutAction}>
          <button className="btn-ghost text-sm" type="submit">Sign out</button>
        </form>
      </header>

      {searchParams.error ? (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {ERRORS[searchParams.error] || "Something went wrong."}
        </div>
      ) : null}
      {searchParams.upgrade === "success" ? (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Thanks for upgrading! Your Pro plan is active.
        </div>
      ) : null}

      {/* Billing card */}
      <section className="card mb-8 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold uppercase tracking-wide text-slate-300">Plan</div>
            <div className="mt-1 text-lg font-bold text-white">
              {isPro ? "Pro" : "Free"}{user.isHost ? " (host)" : ""}
            </div>
            <div className="text-xs text-slate-500">
              {user.isHost ? "Unlimited boards" : `${boards.length} / ${limit === 999 ? "∞" : limit} boards used`}
            </div>
          </div>
          {user.isHost ? (
            <span className="text-xs text-slate-500">Hosts are always Pro.</span>
          ) : isPro ? (
            <form action={createPortalAction}>
              <button className="btn-ghost text-sm" type="submit">Manage billing</button>
            </form>
          ) : stripeEnabled() ? (
            <form action={createCheckoutAction}>
              <button className="btn-gold text-sm" type="submit">Upgrade to Pro</button>
            </form>
          ) : (
            <span className="text-xs text-slate-500">Billing not configured on this instance.</span>
          )}
        </div>
      </section>

      {/* Boards */}
      <section className="mb-6 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-300">Your boards</h2>
        {user.isHost ? (
          <Link href="/host" className="text-xs text-gold-400 hover:underline">Host panel →</Link>
        ) : null}
      </section>

      <CreateBoardForm atLimit={atLimit} />

      <div className="space-y-2">
        {boards.length === 0 ? (
          <div className="card px-6 py-14 text-center text-sm text-slate-500">
            No boards yet. Create your first one above.
          </div>
        ) : (
          boards.map((b) => (
            <div key={b.id} className="card flex items-center justify-between p-4">
              <div>
                <div className="font-semibold text-white">{b.title}</div>
                <div className="text-xs text-slate-500">
                  /{b.slug} · {b._count.entries} entries · {b.isPublic ? "public" : "hidden"}
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/${b.slug}`} target="_blank" className="btn-ghost text-xs">View</Link>
                <Link href={`/dashboard/boards/${b.id}`} className="btn-gold text-xs">Manage</Link>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}

function CreateBoardForm({ atLimit }: { atLimit: boolean }) {
  if (atLimit) {
    return (
      <div className="card mb-6 p-4 text-sm text-slate-400">
        You've hit the Free plan limit (1 board).{" "}
        <span className="text-gold-400">Upgrade to Pro for unlimited boards.</span>
      </div>
    );
  }
  return (
    <form action={createBoardAction} className="card mb-6 flex flex-col gap-3 p-4 sm:flex-row">
      <input className="input" name="title" placeholder="Board title (e.g. My Weekly Wager)" />
      <input className="input sm:w-48" name="slug" placeholder="custom-slug (optional)" />
      <button className="btn-gold whitespace-nowrap" type="submit">Create board</button>
    </form>
  );
}
