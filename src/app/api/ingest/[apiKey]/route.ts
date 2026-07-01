import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type IngestEntry = { username: string; score?: number; prize?: string; avatarUrl?: string };

/**
 * POST /api/ingest/<apiKey>
 * Body: { "replace": boolean, "entries": [{ "username", "score", "prize", "avatarUrl" }] }
 *
 * - replace: true  -> wipes existing entries and inserts the provided list
 * - replace: false -> upserts by username (updates score/prize, creates new)
 */
export async function POST(req: Request, { params }: { params: { apiKey: string } }) {
  const board = await prisma.board.findUnique({ where: { apiKey: params.apiKey }, select: { id: true } });
  if (!board) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

  let body: { replace?: boolean; entries?: IngestEntry[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const entries = Array.isArray(body.entries) ? body.entries : [];
  if (entries.length === 0) return NextResponse.json({ error: "No entries provided" }, { status: 400 });

  const clean = entries
    .filter((e) => e && typeof e.username === "string" && e.username.trim())
    .map((e) => ({
      username: e.username.trim(),
      score: Number(e.score ?? 0) || 0,
      prize: typeof e.prize === "string" ? e.prize : "",
      avatarUrl: typeof e.avatarUrl === "string" ? e.avatarUrl : "",
    }));

  if (body.replace) {
    await prisma.$transaction([
      prisma.entry.deleteMany({ where: { boardId: board.id } }),
      prisma.entry.createMany({ data: clean.map((c) => ({ ...c, boardId: board.id })) }),
    ]);
  } else {
    for (const c of clean) {
      const existing = await prisma.entry.findFirst({ where: { boardId: board.id, username: c.username } });
      if (existing) {
        await prisma.entry.update({ where: { id: existing.id }, data: { score: c.score, prize: c.prize || existing.prize } });
      } else {
        await prisma.entry.create({ data: { ...c, boardId: board.id } });
      }
    }
  }

  const count = await prisma.entry.count({ where: { boardId: board.id } });
  return NextResponse.json({ ok: true, entries: count });
}

export async function GET(_req: Request, { params }: { params: { apiKey: string } }) {
  const board = await prisma.board.findUnique({
    where: { apiKey: params.apiKey },
    include: { entries: { orderBy: [{ score: "desc" }, { createdAt: "asc" }] } },
  });
  if (!board) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  return NextResponse.json({
    board: { title: board.title, slug: board.slug, prizePool: board.prizePool },
    entries: board.entries.map((e, i) => ({
      rank: i + 1,
      username: e.username,
      score: e.score,
      prize: e.prize,
    })),
  });
}
