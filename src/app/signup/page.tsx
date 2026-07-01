import { signupAction } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  invalid_email: "That email doesn't look right.",
  weak_password: "Password must be at least 8 characters.",
  exists: "An account with that email already exists. Try logging in.",
};

export default async function SignupPage({ searchParams }: { searchParams: { error?: string } }) {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <div className="card p-8">
        <h1 className="text-xl font-bold text-white">Create your account</h1>
        <p className="mt-1 text-sm text-slate-400">Free plan includes 1 leaderboard. Upgrade to Pro anytime.</p>
        <form action={signupAction} className="mt-6 space-y-3">
          <input className="input" name="name" placeholder="Your name (optional)" />
          <input className="input" name="email" type="email" placeholder="you@email.com" autoFocus />
          <input className="input" name="password" type="password" placeholder="Password (min 8)" />
          {searchParams.error ? (
            <p className="text-xs text-red-400">{ERRORS[searchParams.error] || "Something went wrong."}</p>
          ) : null}
          <button className="btn-gold w-full" type="submit">Create account</button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-500">
          Already have an account? <Link href="/login" className="text-gold-400 hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
