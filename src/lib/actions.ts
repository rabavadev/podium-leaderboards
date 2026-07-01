"use server";

import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  startSession,
  endSession,
  hashPassword,
  verifyPassword,
  isValidEmail,
  shouldBecomeHost,
} from "@/lib/auth";
import { getStripe, stripeEnabled, siteUrl, PRO_PLAN, boardLimit } from "@/lib/stripe";
import { slugify } from "@/lib/format";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/* ===================== Auth (user accounts) ===================== */

export async function signupAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!isValidEmail(email)) redirect("/signup?error=invalid_email");
  if (password.length < 8) redirect("/signup?error=weak_password");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) redirect("/login?error=exists");

  const passwordHash = hashPassword(password);
  const isHost = await shouldBecomeHost(email);

  const user = await prisma.user.create({
    data: { email, passwordHash, name, isHost, plan: isHost ? PRO_PLAN : "free" },
  });

  await startSession(user.id);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirect("/login?error=invalid");
  }
  await startSession(user.id);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function logoutAction() {
  endSession();
  redirect("/");
}

/* ===================== Stripe billing ===================== */

/** Create a Stripe Checkout session for the Pro plan (subscription mode). */
export async function createCheckoutAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const stripe = getStripe();
  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!stripe || !priceId) {
    redirect("/dashboard?error=stripe_not_configured");
  }

  // Reuse or create the Stripe customer
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
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl()}/dashboard?upgrade=success`,
    cancel_url: `${siteUrl()}/dashboard?upgrade=cancelled`,
    metadata: { userId: user.id },
  });

  if (session.url) redirect(session.url);
  redirect("/dashboard?error=checkout_failed");
}

/** Open the Stripe customer portal (manage card, cancel). */
export async function createPortalAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const stripe = getStripe();
  if (!stripe || !user.stripeCustomerId) redirect("/dashboard?error=stripe_not_configured");

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${siteUrl()}/dashboard`,
  });
  if (session.url) redirect(session.url);
  redirect("/dashboard?error=portal_failed");
}

/* ===================== Boards (scoped to user) ===================== */

async function assertCanEditBoard(boardId: string, token?: string | null, user?: { id: string; isHost: boolean } | null) {
  if (user?.isHost) return;
  if (user) {
    const board = await prisma.board.findUnique({ where: { id: boardId }, select: { userId: true } });
    if (board && board.userId === user.id) return;
  }
  if (token) {
    const board = await prisma.board.findUnique({ where: { id: boardId }, select: { editorToken: true } });
    if (board && board.editorToken === token) return;
  }
  throw new Error("Not authorized to edit this board.");
}

export async function createBoardAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim() || "New Leaderboard";
  let slug = slugify(String(formData.get("slug") ?? "") || title);
  let n = 1;
  const base = slug;
  while (await prisma.board.findUnique({ where: { slug } })) slug = `${base}-${n++}`;

  // Plan limit
  const owned = await prisma.board.count({ where: { userId: user.id } });
  if (!user.isHost && owned >= boardLimit(user.plan)) {
    redirect("/dashboard?error=plan_limit");
  }

  const board = await prisma.board.create({ data: { title, slug, userId: user.id } });
  revalidatePath("/dashboard");
  redirect(`/dashboard/boards/${board.id}`);
}

export async function updateBoardAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const token = formData.get("token") ? String(formData.get("token")) : null;
  const user = await getCurrentUser();

  await assertCanEditBoard(id, token, user);

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

  // Only the owner or host may change slug + socials
  const board = await prisma.board.findUnique({ where: { id }, select: { userId: true } });
  const isOwnerOrHost = user && (board?.userId === user.id || user.isHost);
  if (isOwnerOrHost) {
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

  const updated = await prisma.board.update({ where: { id }, data });
  revalidatePath(`/${updated.slug}`);
  revalidatePath(`/dashboard/boards/${id}`);
  if (token) revalidatePath(`/edit/${token}`);
}

export async function deleteBoardAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const id = String(formData.get("id") ?? "");
  const board = await prisma.board.findUnique({ where: { id }, select: { userId: true } });
  if (!board || (board.userId !== user.id && !user.isHost)) {
    throw new Error("Not authorized.");
  }
  await prisma.board.delete({ where: { id } });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function regenerateSecretAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const id = String(formData.get("id") ?? "");
  const board = await prisma.board.findUnique({ where: { id }, select: { userId: true } });
  if (!board || (board.userId !== user.id && !user.isHost)) {
    throw new Error("Not authorized.");
  }
  const which = String(formData.get("which") ?? "");
  const fresh = crypto.randomUUID().replace(/-/g, "");
  if (which === "editor") await prisma.board.update({ where: { id }, data: { editorToken: fresh } });
  if (which === "api") await prisma.board.update({ where: { id }, data: { apiKey: fresh } });
  revalidatePath(`/dashboard/boards/${id}`);
}

/* ===================== Entries ===================== */

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
  const user = await getCurrentUser();
  await assertCanEditBoard(boardId, token, user);

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
  const user = await getCurrentUser();
  const boardId = await boardIdForEntry(entryId);
  if (!boardId) return;
  await assertCanEditBoard(boardId, token, user);

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
  const user = await getCurrentUser();
  const boardId = await boardIdForEntry(entryId);
  if (!boardId) return;
  await assertCanEditBoard(boardId, token, user);
  await prisma.entry.delete({ where: { id: entryId } });
  await revalidateBoard(boardId, token);
}

export async function bulkImportAction(formData: FormData) {
  const boardId = String(formData.get("boardId") ?? "");
  const token = formData.get("token") ? String(formData.get("token")) : null;
  const user = await getCurrentUser();
  await assertCanEditBoard(boardId, token, user);

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

/* ===================== Host actions ===================== */

export async function hostTogglePlanAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.isHost) redirect("/login");
  const userId = String(formData.get("userId") ?? "");
  const plan = String(formData.get("plan") ?? "free") === PRO_PLAN ? PRO_PLAN : "free";
  await prisma.user.update({ where: { id: userId }, data: { plan } });
  revalidatePath("/host");
}

export async function hostDeleteUserAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.isHost) redirect("/login");
  const userId = String(formData.get("userId") ?? "");
  if (userId === user.id) redirect("/host?error=self");
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/host");
}
