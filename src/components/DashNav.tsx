import Link from "next/link";
import { logoutAction } from "@/lib/actions";
import { PLANS } from "@/lib/plans";

export function DashNav({ email, plan, isPlatformAdmin }: { email: string; plan: string; isPlatformAdmin: boolean }) {
  const planMeta = PLANS[(plan as "free" | "pro") in PLANS ? (plan as "free" | "pro") : "free"];
  return (
    <nav className="mb-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="text-lg font-extrabold tracking-tight text-white">◆ Podium</Link>
        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">Boards</Link>
        <Link href="/dashboard/billing" className="text-sm text-slate-400 hover:text-white">Billing</Link>
        {isPlatformAdmin ? (
          <Link href="/dashboard/admin" className="text-sm text-slate-400 hover:text-white">Admin</Link>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${plan === "pro" ? "bg-gold-500 text-ink-950" : "bg-white/10 text-slate-300"}`}>
          {planMeta.name}
        </span>
        <span className="hidden text-xs text-slate-500 sm:inline">{email}</span>
        <form action={logoutAction}>
          <button className="btn-ghost text-xs" type="submit">Sign out</button>
        </form>
      </div>
    </nav>
  );
}
