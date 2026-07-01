"use server";

import { prisma } from "@/lib/db";
import {
  getSessionUser,
  getSessionUserId,
  startSession,
  endSession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { boardLimitFor } from "@/lib/plans";
import { slugify } from "@/lib/format";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { User } from "@prisma/client";

/* ------------------------------- helpers ------------------------------- */

function appUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Owner (by session) or holder of the board's editor token may edit. */
async function assertCanEditBoard(boardId: string, token?: string | null) {
  const userId = getSessionUserId();
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { ownerId: true, editorToken: true },
  });
  if (!board) throw new Error("Board not found.");
  if (userId && board.ownerId === userId) return;
  if (token && board.editorToken === token) return;
  throw new Error("Not authorized to edit this board.");
}

async function isOwner(boardId: string): Promise<boolean> {
  const userId = getSessionUserId();
  if (!userId) return false;
  const board = await prisma.board.findUnique({ where: { id: boardId }, select: { ownerId: true } });
  return !!board && board.ownerId === userId;
}

/* ------------------------------- auth ------------------------------- */

export async function signupAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!email || !password) redirect("/signup?error=missing");
  if (password.length < 8) redirect("/signup?error=weak");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) redirect("/signup?error=exists");

  const isPlatformAdmin =
    !!process.env.PLATFORM_ADMIN_EMAIL &&
    email === process.env.PLATFORM_ADMIN_EMAIL.trim().toLowerCase();

  const user = await prisma.user.create({
    data: { email, name, passwordHash: hashPassword(password), isPlatformAdmin },
  });
  startSession(user.id);
  redirect("/dashboard");
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirect("/login?error=1");
  }
  startSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  endSession();
  redirect("/login");
}

/* ------------------------------- billing ------------------------------- */

export async function startCheckoutAction() {
  const user = await requireUser();
  if (!stripe || !process.env.STRIPE_PRICE_ID) redirect("/dashboard/billing?error=stripe");

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${appUrl()}/dashboard/billing?success=1`,
    cancel_url: `${appUrl()}/dashboard/billing?canceled=1`,
  });
  if (session.url) redirect(session.url);
  redirect("/dashboard/billing?error=stripe");
}

export async function openPortalAction() {
  const user = await requireUser();
  if (!stripe || !user.stripeCustomerId) redirect("/dashboard/billing?error=stripe");
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl()}/dashboard/billing`,
  });
  redirect(session.url);
}

/* ------------------------------- boards ------------------------------- */

export async function createBoardAction(formData: FormData) {
  const user = await requireUser();

  const count = await prisma.board.count({ where: { ownerId: user.id } });
  if (count >= boardLimitFor(user.plan)) {
    redirect("/dashboard/billing?limit=1");
  }

  const title = String(formData.get("title") ?? "").trim() || "New Leaderboard";
  let slug = slugify(String(formData.get("slug") ?? "") || title);
  let n = 1;
  const base = slug;
  while (await prisma.board.findUnique({ where: { slug } })) slug = `${base}-${n++}`;

  const board = await prisma.board.create({ data: { title, slug, ownerId: user.id } });
  revalidatePath("/dashboard");
  redirect(`/dashboard/boards/${board.id}`);
}

export async function updateBoardAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const token = formData.get("token") ? String(formData.get("token")) : null;
  await assertCanEditBoard(id, token);
  const owner = await isOwner(id);

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

  // Only the board owner may change slug + socials
  if (owner) {
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
  revalidatePath(`/dashboard/boards/${id}`);
  if (token) revalidatePath(`/edit/${token}`);
}

export async function deleteBoardAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!(await isOwner(id))) throw new Error("Only the owner can delete this board.");
  await prisma.board.delete({ where: { id } });
  redirect("/dashboard");
}

export async function regenerateSecretAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!(await isOwner(id))) throw new Error("Owner only.");
  const which = String(formData.get("which") ?? "");
  const fresh = crypto.randomUUID().replace(/-/g, "");
  if (which === "editor") await prisma.board.update({ where: { id }, data: { editorToken: fresh } });
  if (which === "api") await prisma.board.update({ where: { id }, data: { apiKey: fresh } });
  revalidatePath(`/dashboard/boards/${id}`);
}

/* ------------------------------- entries ------------------------------- */

async function boardIdForEntry(entryId: string): Promise<string | null> {
  const e = await prisma.entry.findUnique({ where: { id: entryId }, select: { boardId: true } });
  return e?.boardId ?? null;
}

async function revalidateBoard(boardId: string, token?: string | null) {
  const b = await prisma.board.findUnique({ where: { id: boardId }, select: { slug: true } });
  if (b) revalidatePath(`/${b.slug}`);
  revalidatePath(`/dashboard/boards/${boardId}`);
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
