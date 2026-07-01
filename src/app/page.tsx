import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const boards = await prisma.board.findMany({
    where: { isPublic: true },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { entries: true } } },
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <nav className="mb-16 flex items-center justify-between">
        <span className="text-lg font-extrabold tracking-tight text-white">◆ Podium</span>
        <Link href="/admin" className="btn-ghost text-sm">Admin</Link>
      </nav>

      <section className="text-center">
        <h1 className="mx-auto max-w-2xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Host live leaderboards people actually want to watch.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-slate-400">
          Casino affiliates, streamers, esports, communities — spin up a branded, shareable
          leaderboard in minutes. Update it by hand, by CSV, or by API.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/admin" className="btn-gold">Create a leaderboard</Link>
          {boards[0] ? (
            <Link href={`/${boards[0].slug}`} className="btn-ghost">See a live example</Link>
          ) : null}
        </div>
      </section>

      <section className="mt-20">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Live boards</h2>
        {boards.length === 0 ? (
          <div className="card px-6 py-14 text-center text-sm text-slate-500">
            No public boards yet. <Link href="/admin" className="text-gold-400">Create the first one →</Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {boards.map((b) => (
              <Link
                key={b.id}
                href={`/${b.slug}`}
                className="card group flex items-center justify-between p-5 transition hover:border-gold-500/30"
              >
                <div>
                  <div className="font-semibold text-white">{b.title}</div>
                  <div className="text-xs text-slate-500">
                    {b._count.entries} entries{b.prizePool ? ` · ${b.prizePool}` : ""}
                  </div>
                </div>
                <span className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-gold-400">→</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-24 text-center text-xs text-slate-600">
        Podium — open-source leaderboard hosting.
      </footer>
    </main>
  );
}
