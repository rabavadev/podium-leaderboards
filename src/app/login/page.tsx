import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAction } from "@/lib/actions";
import { getSessionUserId } from "@/lib/auth";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  if (getSessionUserId()) redirect("/dashboard");
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <Link href="/" className="mb-6 text-center text-lg font-extrabold tracking-tight text-white">◆ Podium</Link>
      <div className="card p-8">
        <h1 className="text-xl font-bold text-white">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-400">Sign in to manage your leaderboards.</p>
        <form action={loginAction} className="mt-6 space-y-3">
          <input className="input" type="email" name="email" placeholder="you@example.com" autoFocus required />
          <input className="input" type="password" name="password" placeholder="Password" required />
          {searchParams.error ? <p className="text-xs text-red-400">Invalid email or password.</p> : null}
          <button className="btn-gold w-full" type="submit">Sign in</button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          No account? <Link href="/signup" className="text-gold-400 hover:underline">Create one</Link>
        </p>
      </div>
    </main>
  );
}
