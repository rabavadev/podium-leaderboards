import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import type { User } from "@prisma/client";

const COOKIE = "podium_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret(): string {
  return process.env.SESSION_SECRET || "dev-insecure-secret-change-me";
}

/* ------------------------- password hashing (scrypt) ------------------------- */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(test, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ------------------------------- sessions ------------------------------- */

function sign(value: string): string {
  const mac = crypto.createHmac("sha256", secret()).update(value).digest("hex");
  return `${value}.${mac}`;
}

function unsign(signed: string | undefined): string | null {
  if (!signed) return null;
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);
  const expected = crypto.createHmac("sha256", secret()).update(value).digest("hex");
  try {
    if (crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return value;
  } catch {
    /* fallthrough */
  }
  return null;
}

export function startSession(userId: string) {
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

export function getSessionUserId(): string | null {
  return unsign(cookies().get(COOKIE)?.value);
}

export async function getSessionUser(): Promise<User | null> {
  const id = getSessionUserId();
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}
