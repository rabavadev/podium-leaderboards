export type PlanId = "free" | "pro";

export const PLANS: Record<PlanId, { name: string; price: string; boardLimit: number; features: string[] }> = {
  free: {
    name: "Free",
    price: "$0",
    boardLimit: 1,
    features: ["1 leaderboard", "Public page + editor link", "Bulk import + ingest API", "Podium branding"],
  },
  pro: {
    name: "Pro",
    price: "$19/mo",
    boardLimit: Infinity,
    features: ["Unlimited leaderboards", "Everything in Free", "Priority support", "Remove Podium branding (coming soon)"],
  },
};

export function boardLimitFor(plan: string): number {
  return plan === "pro" ? Infinity : PLANS.free.boardLimit;
}

export function planIsActive(status: string): boolean {
  return status === "active" || status === "trialing";
}
