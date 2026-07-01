import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function Home() {
  const loggedIn = !!getSessionUserId();
  const boards = await prisma.board.findMany({
    where: { isPublic: true },
    orderBy: { updatedAt: "desc" },
    take: 6,
    include: { _count: { select: { entries: true } } },
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <nav className="mb-16 flex items-center justify-between">
        <span className="text-lg font-extrabold tracking-tight text-white">◆ Podium</span>
        <div className="flex items-center gap-3">
          <Link href="#pricing" className="hidden text-sm text-slate-400 hover:text-white sm:inline">Pricing</Link>
          {loggedIn ? (
            <Link href="/dashboard" className="btn-gold text-sm">Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost text-sm">Sign in</Link>
              <Link href="/signup" className="btn-gold text-sm">Get started</Link>
            </>
          )}
        </div>
      </nav>

      <section className="text-center">
        <h1 className="mx-auto max-w-2xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Host live leaderboards people actually want to watch.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-slate-400">
          Casino affiliates, streamers, esports, communities — spin up a branded, shareable
          leaderboard in minutes. Update it by hand, by CSV, or by API. Hand editors a private
          link, no password sharing.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/signup" className="btn-gold">Start free</Link>
          {boards[0] ? <Link href={`/${boards[0].slug}`} className="btn-ghost">See a live board</Link> : null}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mt-24">
        <h2 className="mb-6 text-center text-2xl font-extrabold text-white">Simple pricing</h2>
        <div className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-2">
          {(["free", "pro"] as const).map((id) => {
            const plan = PLANS[id];
            return (
              <div key={id} className={`card p-6 ${id === "pro" ? "ring-1 ring-gold-500/40" : ""}`}>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                  <span className="text-sm text-slate-400">{plan.price}</span>
                </div>
                <ul className="mt-4 space-y-1.5 text-sm text-slate-400">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2"><span className="text-gold-400">✓</span>{f}</li>
                  ))}
                </ul>
                <Link href="/signup" className={`mt-5 w-full ${id === "pro" ? "btn-gold" : "btn-ghost"}`}>
                  {id === "pro" ? "Go Pro" : "Start free"}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {boards.length > 0 ? (
        <section className="mt-24">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Live boards</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {boards.map((b) => (
              <Link key={b.id} href={`/${b.slug}`} className="card group flex items-center justify-between p-5 transition hover:border-gold-500/30">
                <div>
                  <div className="font-semibold text-white">{b.title}</div>
                  <div className="text-xs text-slate-500">{b._count.entries} entries{b.prizePool ? ` · ${b.prizePool}` : ""}</div>
                </div>
                <span className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-gold-400">→</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="mt-24 text-center text-xs text-slate-600">Podium — leaderboard hosting.</footer>
    </main>
  );
}
