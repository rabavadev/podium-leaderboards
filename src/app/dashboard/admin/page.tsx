import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { DashNav } from "@/components/DashNav";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.isPlatformAdmin) redirect("/dashboard");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { boards: true } } },
  });
  const proCount = users.filter((u) => u.plan === "pro").length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <DashNav email={user.email} plan={user.plan} isPlatformAdmin={user.isPlatformAdmin} />
      <h1 className="mb-1 text-2xl font-extrabold text-white">Platform admin</h1>
      <p className="mb-6 text-sm text-slate-500">{users.length} accounts · {proCount} on Pro</p>
      <div className="card divide-y divide-white/5 overflow-hidden">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between px-5 py-3.5">
            <div>
              <div className="text-sm font-semibold text-white">{u.email}</div>
              <div className="text-xs text-slate-500">
                {u._count.boards} boards · joined {new Date(u.createdAt).toLocaleDateString()}
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${u.plan === "pro" ? "bg-gold-500 text-ink-950" : "bg-white/10 text-slate-300"}`}>
              {u.plan}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
