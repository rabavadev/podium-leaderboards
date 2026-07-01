import { loginAction } from "@/lib/actions";
import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  if (isAdmin()) redirect("/admin");
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <div className="card p-8">
        <h1 className="text-xl font-bold text-white">◆ Podium admin</h1>
        <p className="mt-1 text-sm text-slate-400">Enter the admin password to manage boards.</p>
        <form action={loginAction} className="mt-6 space-y-3">
          <input className="input" type="password" name="password" placeholder="Admin password" autoFocus />
          {searchParams.error ? (
            <p className="text-xs text-red-400">Incorrect password.</p>
          ) : null}
          <button className="btn-gold w-full" type="submit">Sign in</button>
        </form>
        <p className="mt-4 text-xs text-slate-600">Set <code>ADMIN_PASSWORD</code> in your .env file.</p>
      </div>
    </main>
  );
}
