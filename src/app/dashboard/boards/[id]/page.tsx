import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { BoardEditor } from "@/components/BoardEditor";

export const dynamic = "force-dynamic";

function baseUrlFromHeaders(): string {
  const host = headers().get("x-forwarded-host") ?? headers().get("host") ?? "localhost:3000";
  const proto = headers().get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
import { headers } from "next/headers";

export default async function ManageBoard({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const board = await prisma.board.findUnique({
    where: { id: params.id },
    include: { entries: { orderBy: [{ score: "desc" }, { createdAt: "asc" }] } },
  });
  if (!board) notFound();

  const isOwner = board.userId === user.id;
  const canManage = isOwner || user.isHost;
  if (!canManage) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">← Dashboard</Link>
        <Link href={`/${board.slug}`} target="_blank" className="btn-ghost text-xs">Open public page ↗</Link>
      </div>
      <h1 className="mb-6 text-2xl font-extrabold text-white">{board.title}</h1>
      <BoardEditor board={board} entries={board.entries} canManageSocials={canManage} token={undefined} baseUrl={baseUrlFromHeaders()} />
    </main>
  );
}
