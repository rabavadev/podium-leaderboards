import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { createBoardAction } from "@/lib/actions";
import { boardLimitFor, PLANS } from "@/lib/plans";
import { DashNav } from "@/components/DashNav";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const boards = await prisma.board.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { entries: true } } },
  });

  const limit = boardLimitFor(user.plan);
  const atLimit = boards.length >= limit;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <DashNav email={user.email} plan={user.plan} isPlatformAdmin={user.isPlatformAdmin} />

      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Your leaderboards</h1>
          <p className="text-sm text-slate-500">
            {boards.length} of {limit === Infinity ? "unlimited" : limit} used
          </p>
        </div>
      </div>

      <section className="card mb-8 p-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-300">New board</h2>
        {atLimit ? (
          <div className="rounded-xl border border-gold-500/30 bg-gold-500/5 p-4 text-sm text-slate-300">
            You&apos;ve hit the {PLANS.free.name} plan limit of {limit} board{limit === 1 ? "" : "s"}.{" "}
            <Link href="/dashboard/billing" className="font-semibold text-gold-400 hover:underline">
              Upgrade to Pro
            </Link>{" "}
            for unlimited leaderboards.
          </div>
        ) : (
          <form action={createBoardAction} className="flex flex-col gap-3 sm:flex-row">
            <input className="input" name="title" placeholder="Board title (e.g. ChuckyBTZ Leaderboard)" />
            <input className="input sm:w-56" name="slug" placeholder="custom-slug (optional)" />
            <button className="btn-gold whitespace-nowrap" type="submit">Create</button>
          </form>
        )}
      </section>

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
                <Link href={`/${b.slug}`} className="btn-ghost text-xs" target="_blank">View</Link>
                <Link href={`/dashboard/boards/${b.id}`} className="btn-gold text-xs">Manage</Link>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
