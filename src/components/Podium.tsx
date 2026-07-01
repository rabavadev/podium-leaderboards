export function Crown({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M3 8l4 3 5-6 5 6 4-3-2 11H5L3 8z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

export function rankStyle(rank: number): { ring: string; badge: string; label: string } {
  switch (rank) {
    case 1:
      return { ring: "ring-2 ring-gold-500/70", badge: "bg-gold-500 text-ink-950", label: "1st" };
    case 2:
      return { ring: "ring-2 ring-slate-300/40", badge: "bg-slate-300 text-ink-950", label: "2nd" };
    case 3:
      return { ring: "ring-2 ring-amber-700/50", badge: "bg-amber-700 text-white", label: "3rd" };
    default:
      return { ring: "ring-1 ring-white/5", badge: "bg-white/10 text-slate-300", label: `${rank}` };
  }
}
