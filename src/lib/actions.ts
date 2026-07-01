"use server";

import { prisma } from "@/lib/db";
import { isAdmin, checkPassword, startSession, endSession } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/** Throw unless the caller is the master admin, or holds this board's editor token. */
async function assertCanEditBoard(boardId: string, token?: string | null) {
  if (isAdmin()) return;
  if (token) {
    const board = await prisma.board.findUnique({ where: { id: boardId }, select: { editorToken: true } });
    if (board && board.editorToken === token) return;
  }
  throw new Error("Not authorized to edit this board.");
}

async function assertAdmin() {
  if (!isAdmin()) throw new Error("Admin only.");
}

/* ----------------------------- Auth ----------------------------- */

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) {
    redirect("/admin/login?error=1");
  }
  startSession();
  redirect("/admin");
}

export async function logoutAction() {
  endSession();
  redirect("/admin/login");
}

/* ----------------------------- Boards ----------------------------- */

export async function createBoardAction(formData: FormData) {
  await assertAdmin();
  const title = String(formData.get("title") ?? "").trim() || "New Leaderboard";
  let slug = slugify(String(formData.get("slug") ?? "") || title);

  // Ensure slug is unique
  let n = 1;
  const base = slug;
  while (await prisma.board.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }

  const board = await prisma.board.create({ data: { title, slug } });
  revalidatePath("/admin");
  redirect(`/admin/boards/${board.id}`);
}

export async function updateBoardAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const token = formData.get("token") ? String(formData.get("token")) : null;
  await assertCanEditBoard(id, token);

  const data: Record<string, unknown> = {
    title: String(formData.get("title") ?? "").trim(),
    subtitle: String(formData.get("subtitle") ?? ""),
    description: String(formData.get("description") ?? ""),
    rules: String(formData.get("rules") ?? ""),
    promoCode: String(formData.get("promoCode") ?? ""),
    ctaText: String(formData.get("ctaText") ?? ""),
    ctaUrl: String(formData.get("ctaUrl") ?? ""),
    accentColor: String(formData.get("accentColor") ?? "#f5b301"),
    logoUrl: String(formData.get("logoUrl") ?? ""),
    prizePool: String(formData.get("prizePool") ?? ""),
    currency: String(formData.get("currency") ?? "$") || "$",
    maskNames: formData.get("maskNames") === "on",
    isPublic: formData.get("isPublic") === "on",
  };

  // Only the admin may change the slug and socials
  if (isAdmin()) {
    const rawSlug = String(formData.get("slug") ?? "").trim();
    if (rawSlug) {
      const slug = slugify(rawSlug);
      const clash = await prisma.board.findFirst({ where: { slug, NOT: { id } } });
      if (!clash) data.slug = slug;
    }
    const socials: Record<string, string> = {};
    for (const key of ["kick", "youtube", "twitch", "instagram", "discord", "telegram", "x", "tiktok", "website"]) {
      const v = String(formData.get(`social_${key}`) ?? "").trim();
      if (v) socials[key] = v;
    }
    data.socials = JSON.stringify(socials);
  }

  const board = await prisma.board.update({ where: { id }, data });
  revalidatePath(`/${board.slug}`);
  revalidatePath(`/admin/boards/${id}`);
  if (token) revalidatePath(`/edit/${token}`);
}

export async function deleteBoardAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.board.delete({ where: { id } });
  revalidatePath("/admin");
  redirect("/admin");
}

export async function regenerateSecretAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const which = String(formData.get("which") ?? "");
  const fresh = crypto.randomUUID().replace(/-/g, "");
  if (which === "editor") await prisma.board.update({ where: { id }, data: { editorToken: fresh } });
  if (which === "api") await prisma.board.update({ where: { id }, data: { apiKey: fresh } });
  revalidatePath(`/admin/boards/${id}`);
}

/* ----------------------------- Entries ----------------------------- */

async function boardIdForEntry(entryId: string): Promise<string | null> {
  const e = await prisma.entry.findUnique({ where: { id: entryId }, select: { boardId: true } });
  return e?.boardId ?? null;
}

async function revalidateBoard(boardId: string, token?: string | null) {
  const b = await prisma.board.findUnique({ where: { id: boardId }, select: { slug: true } });
  if (b) revalidatePath(`/${b.slug}`);
  revalidatePath(`/admin/boards/${boardId}`);
  if (token) revalidatePath(`/edit/${token}`);
}

export async function addEntryAction(formData: FormData) {
  const boardId = String(formData.get("boardId") ?? "");
  const token = formData.get("token") ? String(formData.get("token")) : null;
  await assertCanEditBoard(boardId, token);

  const username = String(formData.get("username") ?? "").trim();
  if (!username) return;
  await prisma.entry.create({
    data: {
      boardId,
      username,
      score: Number(formData.get("score") ?? 0) || 0,
      prize: String(formData.get("prize") ?? ""),
      avatarUrl: String(formData.get("avatarUrl") ?? ""),
    },
  });
  await revalidateBoard(boardId, token);
}

export async function updateEntryAction(formData: FormData) {
  const entryId = String(formData.get("entryId") ?? "");
  const token = formData.get("token") ? String(formData.get("token")) : null;
  const boardId = await boardIdForEntry(entryId);
  if (!boardId) return;
  await assertCanEditBoard(boardId, token);

  await prisma.entry.update({
    where: { id: entryId },
    data: {
      username: String(formData.get("username") ?? "").trim(),
      score: Number(formData.get("score") ?? 0) || 0,
      prize: String(formData.get("prize") ?? ""),
      avatarUrl: String(formData.get("avatarUrl") ?? ""),
    },
  });
  await revalidateBoard(boardId, token);
}

export async function deleteEntryAction(formData: FormData) {
  const entryId = String(formData.get("entryId") ?? "");
  const token = formData.get("token") ? String(formData.get("token")) : null;
  const boardId = await boardIdForEntry(entryId);
  if (!boardId) return;
  await assertCanEditBoard(boardId, token);
  await prisma.entry.delete({ where: { id: entryId } });
  await revalidateBoard(boardId, token);
}

/**
 * Bulk import. Paste rows of "username, score, prize" (one per line).
 * Existing usernames are updated (upsert by username); new ones are created.
 */
export async function bulkImportAction(formData: FormData) {
  const boardId = String(formData.get("boardId") ?? "");
  const token = formData.get("token") ? String(formData.get("token")) : null;
  await assertCanEditBoard(boardId, token);

  const raw = String(formData.get("csv") ?? "");
  const rows = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^username\s*,/i.test(l));

  for (const line of rows) {
    const parts = line.split(",").map((p) => p.trim());
    const username = parts[0];
    if (!username) continue;
    const score = Number((parts[1] ?? "0").replace(/[$,]/g, "")) || 0;
    const prize = parts[2] ?? "";
    const existing = await prisma.entry.findFirst({ where: { boardId, username } });
    if (existing) {
      await prisma.entry.update({ where: { id: existing.id }, data: { score, prize: prize || existing.prize } });
    } else {
      await prisma.entry.create({ data: { boardId, username, score, prize } });
    }
  }
  await revalidateBoard(boardId, token);
}
