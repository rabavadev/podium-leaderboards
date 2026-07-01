export function maskUsername(name: string): string {
  const n = name.trim();
  if (n.length <= 2) return n[0] ? n[0] + "*" : "*";
  if (n.length <= 4) return n[0] + "***" + n[n.length - 1];
  return n.slice(0, 2) + "*****" + n.slice(-2);
}

export function formatScore(score: number, currency = "$"): string {
  return (
    currency +
    score.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

export function parseSocials(json: string): Record<string, string> {
  try {
    const obj = JSON.parse(json || "{}");
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "board";
}
