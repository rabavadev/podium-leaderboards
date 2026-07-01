import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { BoardEditor } from "@/components/BoardEditor";

export const dynamic = "force-dynamic";

function baseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function ManageBoard({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const board = await prisma.board.findUnique({
    where: { id: params.id },
    include: { entries: { orderBy: [{ score: "desc" }, { createdAt: "asc" }] } },
  });
  if (!board) notFound();
  if (board.ownerId !== user.id) notFound(); // don't reveal other owners' boards

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">← All boards</Link>
        <Link href={`/${board.slug}`} target="_blank" className="btn-ghost text-xs">Open public page ↗</Link>
      </div>
      <h1 className="mb-6 text-2xl font-extrabold text-white">{board.title}</h1>
      <BoardEditor board={board} entries={board.entries} canManageSocials token={undefined} baseUrl={baseUrl()} />
    </main>
  );
}
