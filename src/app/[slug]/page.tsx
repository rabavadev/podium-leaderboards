import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { LeaderboardView } from "@/components/LeaderboardView";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const board = await prisma.board.findUnique({ where: { slug: params.slug } });
  if (!board) return { title: "Not found" };
  return { title: `${board.title} — Leaderboard`, description: board.description || board.subtitle };
}

export default async function BoardPage({ params }: { params: { slug: string } }) {
  const board = await prisma.board.findUnique({
    where: { slug: params.slug },
    include: { entries: { orderBy: [{ score: "desc" }, { createdAt: "asc" }] } },
  });

  if (!board || !board.isPublic) notFound();

  return <LeaderboardView board={board} entries={board.entries} />;
}
