import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { createBoardAction, logoutAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  if (!isAdmin()) redirect("/admin/login");

  const boards = await prisma.board.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { entries: true } } },
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">◆ Podium admin</h1>
          <p className="text-sm text-slate-500">{boards.length} board{boards.length === 1 ? "" : "s"}</p>
        </div>
        <form action={logoutAction}>
          <button className="btn-ghost text-sm" type="submit">Sign out</button>
        </form>
      </header>

      <section className="card mb-8 p-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-300">New board</h2>
        <form action={createBoardAction} className="flex flex-col gap-3 sm:flex-row">
          <input className="input" name="title" placeholder="Board title (e.g. ChuckyBTZ Leaderboard)" />
          <input className="input sm:w-56" name="slug" placeholder="custom-slug (optional)" />
          <button className="btn-gold whitespace-nowrap" type="submit">Create</button>
        </form>
      </section>

      <div className="space-y-2">
        {boards.map((b) => (
          <div key={b.id} className="card flex items-center justify-between p-4">
            <div>
              <div className="font-semibold text-white">{b.title}</div>
              <div className="text-xs text-slate-500">
                /{b.slug} · {b._count.entries} entries · {b.isPublic ? "public" : "hidden"}
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/${b.slug}`} className="btn-ghost text-xs" target="_blank">View</Link>
              <Link href={`/admin/boards/${b.id}`} className="btn-gold text-xs">Manage</Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
