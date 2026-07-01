import { loginAction } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  invalid: "Wrong email or password.",
  exists: "That email is already registered. Sign in instead.",
};

export default async function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <div className="card p-8">
        <h1 className="text-xl font-bold text-white">Sign in to Podium</h1>
        <form action={loginAction} className="mt-6 space-y-3">
          <input className="input" name="email" type="email" placeholder="you@email.com" autoFocus />
          <input className="input" name="password" type="password" placeholder="Password" />
          {searchParams.error ? (
            <p className="text-xs text-red-400">{ERRORS[searchParams.error] || "Something went wrong."}</p>
          ) : null}
          <button className="btn-gold w-full" type="submit">Sign in</button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-500">
          No account? <Link href="/signup" className="text-gold-400 hover:underline">Create one</Link>
        </p>
      </div>
    </main>
  );
}
