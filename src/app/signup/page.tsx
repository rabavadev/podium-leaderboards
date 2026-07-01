import Link from "next/link";
import { redirect } from "next/navigation";
import { signupAction } from "@/lib/actions";
import { getSessionUserId } from "@/lib/auth";

const ERRORS: Record<string, string> = {
  missing: "Email and password are required.",
  weak: "Password must be at least 8 characters.",
  exists: "An account with that email already exists.",
};

export default function SignupPage({ searchParams }: { searchParams: { error?: string } }) {
  if (getSessionUserId()) redirect("/dashboard");
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <Link href="/" className="mb-6 text-center text-lg font-extrabold tracking-tight text-white">◆ Podium</Link>
      <div className="card p-8">
        <h1 className="text-xl font-bold text-white">Create your account</h1>
        <p className="mt-1 text-sm text-slate-400">Start hosting leaderboards in minutes.</p>
        <form action={signupAction} className="mt-6 space-y-3">
          <input className="input" name="name" placeholder="Your name (optional)" />
          <input className="input" type="email" name="email" placeholder="you@example.com" required />
          <input className="input" type="password" name="password" placeholder="Password (min 8 chars)" required minLength={8} />
          {searchParams.error ? (
            <p className="text-xs text-red-400">{ERRORS[searchParams.error] ?? "Something went wrong."}</p>
          ) : null}
          <button className="btn-gold w-full" type="submit">Create account</button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Have an account? <Link href="/login" className="text-gold-400 hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
