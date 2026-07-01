import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { BoardEditor } from "@/components/BoardEditor";

export const dynamic = "force-dynamic";

function baseUrlFromHeaders(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function EditByToken({ params }: { params: { token: string } }) {
  const board = await prisma.board.findUnique({
    where: { editorToken: params.token },
    include: { entries: { orderBy: [{ score: "desc" }, { createdAt: "asc" }] } },
  });
  if (!board) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold-400">Editor access</div>
      <h1 className="mb-1 text-2xl font-extrabold text-white">{board.title}</h1>
      <p className="mb-6 text-sm text-slate-500">
        You can update entries and content for this board. Keep this link private.
      </p>
      <BoardEditor board={board} entries={board.entries} canManageSocials={false} token={params.token} baseUrl={baseUrlFromHeaders()} />
    </main>
  );
}
