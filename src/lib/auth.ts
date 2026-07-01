import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import type { User } from "@prisma/client";

const COOKIE = "podium_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret(): string {
  return process.env.SESSION_SECRET || "dev-insecure-secret-change-me";
}

function sign(value: string): string {
  const mac = crypto.createHmac("sha256", secret()).update(value).digest("hex");
  return `${value}.${mac}`;
}

function verify(signed: string | undefined): string | null {
  if (!signed) return null;
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);
  const expected = crypto.createHmac("sha256", secret()).update(value).digest("hex");
  try {
    if (crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return value;
  } catch {
    /* mismatch */
  }
  return null;
}

/* ----------------- Password hashing (scrypt) ----------------- */

export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(plain, salt, 64).toString("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(test), Buffer.from(hash));
  } catch {
    return false;
  }
}

/* ----------------- Email validation ----------------- */

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

/* ----------------- Sessions ----------------- */

export async function startSession(userId: string) {
  cookies().set(COOKIE, sign(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function endSession() {
  cookies().delete(COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const userId = verify(cookies().get(COOKIE)?.value);
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function requireUser(): Promise<User> {
  const u = await getCurrentUser();
  if (!u) throw new Error("LOGIN_REQUIRED");
  return u;
}

export async function isHost(): Promise<boolean> {
  const u = await getCurrentUser();
  return !!u?.isHost;
}

/** Used in server components (redirect on no user). */
export async function requireUserOrRedirect(): Promise<User | null> {
  return await getCurrentUser();
}

/** The host is: the user whose email matches HOST_EMAIL, OR the first user to
 *  ever sign up (bootstrap), OR a user already flagged isHost. */
export async function shouldBecomeHost(email: string): Promise<boolean> {
  const hostEmail = (process.env.HOST_EMAIL || "").trim().toLowerCase();
  if (hostEmail && email.toLowerCase() === hostEmail) return true;
  const count = await prisma.user.count();
  return count === 0;
}
