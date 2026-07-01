import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hostTogglePlanAction, hostDeleteUserAction, logoutAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function HostPage({ searchParams }: { searchParams: { error?: string } }) {
  const user = await getCurrentUser();
  if (!user || !user.isHost) redirect("/dashboard");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { boards: true } } },
  });
  const boards = await prisma.board.findMany({
    orderBy: { updatedAt: "desc" },
    include: { owner: { select: { email: true } }, _count: { select: { entries: true } } },
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">◆ Host panel</h1>
          <p className="text-sm text-slate-500">{users.length} users · {boards.length} boards</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard" className="btn-ghost text-sm">My dashboard</Link>
          <form action={logoutAction}>
            <button className="btn-ghost text-sm" type="submit">Sign out</button>
          </form>
        </div>
      </header>

      {searchParams.error === "self" ? (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          You can't delete your own host account.
        </div>
      ) : null}

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-300">Users</h2>
      <div className="card mb-10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Boards</th>
              <th className="px-4 py-3">Stripe</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{u.email}{u.isHost ? " 🏠" : ""}</div>
                  {u.name ? <div className="text-xs text-slate-500">{u.name}</div> : null}
                </td>
                <td className="px-4 py-3">
                  <span className={u.plan === "pro" ? "text-gold-400" : "text-slate-400"}>{u.plan}</span>
                </td>
                <td className="px-4 py-3 text-slate-300">{u._count.boards}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{u.stripeSubscriptionStatus || "—"}</td>
                <td className="px-4 py-3 text-right">
                  {u.id === user.id ? (
                    <span className="text-xs text-slate-600">you</span>
                  ) : (
                    <span className="inline-flex gap-2">
                      <form action={hostTogglePlanAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="plan" value={u.plan === "pro" ? "free" : "pro"} />
                        <button className="rounded-lg px-2.5 py-1 text-xs text-gold-400 hover:bg-gold-500/10" type="submit">
                          {u.plan === "pro" ? "→ Free" : "→ Pro"}
                        </button>
                      </form>
                      <form action={hostDeleteUserAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <button className="rounded-lg px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/10" type="submit">Delete</button>
                      </form>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-300">All boards</h2>
      <div className="card divide-y divide-white/5 overflow-hidden">
        {boards.map((b) => (
          <div key={b.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-medium text-white">{b.title}</div>
              <div className="text-xs text-slate-500">
                /{b.slug} · {b._count.entries} entries · owner: {b.owner?.email || "—"}
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/${b.slug}`} target="_blank" className="btn-ghost text-xs">View</Link>
              <Link href={`/dashboard/boards/${b.id}`} className="btn-gold text-xs">Manage</Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
