import { maskUsername, formatScore, parseSocials } from "@/lib/format";
import { rankStyle, Crown } from "./Podium";

type Entry = {
  id: string;
  username: string;
  score: number;
  prize: string;
  avatarUrl: string;
};

type Board = {
  title: string;
  subtitle: string;
  description: string;
  rules: string;
  promoCode: string;
  ctaText: string;
  ctaUrl: string;
  accentColor: string;
  logoUrl: string;
  prizePool: string;
  currency: string;
  socials: string;
  maskNames: boolean;
};

const SOCIAL_LABELS: Record<string, string> = {
  kick: "Kick",
  youtube: "YouTube",
  twitch: "Twitch",
  instagram: "Instagram",
  discord: "Discord",
  telegram: "Telegram",
  x: "X",
  twitter: "X",
  tiktok: "TikTok",
  website: "Website",
};

export function LeaderboardView({ board, entries }: { board: Board; entries: Entry[] }) {
  const accent = board.accentColor || "#f5b301";
  const socials = parseSocials(board.socials);
  const name = (e: Entry) => (board.maskNames ? maskUsername(e.username) : e.username);
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div style={{ ["--accent" as any]: accent }} className="mx-auto max-w-3xl px-4 pb-24 pt-10">
      {/* Header */}
      <header className="text-center">
        {board.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={board.logoUrl} alt="" className="mx-auto mb-5 h-20 w-20 rounded-2xl object-cover ring-2 ring-white/10" />
        ) : null}
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{board.title}</h1>
        {board.subtitle ? <p className="mt-2 text-sm text-slate-400">{board.subtitle}</p> : null}

        {board.prizePool ? (
          <div
            className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-bold"
            style={{ borderColor: accent, color: accent }}
          >
            <Crown className="h-4 w-4" />
            {board.prizePool} Prize Pool
          </div>
        ) : null}

        {board.description ? (
          <p className="mx-auto mt-5 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-slate-300">
            {board.description}
          </p>
        ) : null}

        {board.ctaUrl ? (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href={board.ctaUrl}
              target="_blank"
              rel="noreferrer"
              className="btn font-bold text-ink-950"
              style={{ background: accent, boxShadow: `0 0 40px -10px ${accent}` }}
            >
              {board.ctaText || "Play now"}
            </a>
            {board.promoCode ? (
              <span className="rounded-xl border border-white/10 bg-ink-850 px-4 py-2.5 text-sm">
                Code <b className="text-white">{board.promoCode}</b>
              </span>
            ) : null}
          </div>
        ) : null}
      </header>

      {/* Podium (top 3) */}
      {top3.length > 0 ? (
        <section className="mt-12 grid grid-cols-3 items-end gap-3">
          {[top3[1], top3[0], top3[2]].map((e, i) => {
            if (!e) return <div key={`empty-${i}`} />;
            const rank = entries.indexOf(e) + 1;
            const rs = rankStyle(rank);
            const heights = ["h-28", "h-36", "h-24"];
            return (
              <div key={e.id} className="flex flex-col items-center">
                <div className={`mb-3 h-14 w-14 overflow-hidden rounded-full bg-ink-700 ${rs.ring}`}>
                  {e.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-black text-slate-400">
                      {e.username[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="max-w-full truncate text-sm font-semibold text-white">{name(e)}</div>
                <div className="text-xs text-slate-400">{formatScore(e.score, board.currency)}</div>
                <div
                  className={`mt-3 w-full ${heights[i]} rounded-t-xl border border-white/5 bg-ink-850/80 pt-3 text-center`}
                >
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${rs.badge}`}>
                    {rank}
                  </span>
                  {e.prize ? <div className="mt-2 text-xs font-bold" style={{ color: accent }}>{e.prize}</div> : null}
                </div>
              </div>
            );
          })}
        </section>
      ) : null}

      {/* Full list */}
      <section className="card mt-8 divide-y divide-white/5 overflow-hidden">
        {entries.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-500">No entries yet.</div>
        ) : (
          entries.map((e, idx) => {
            const rank = idx + 1;
            const rs = rankStyle(rank);
            return (
              <div key={e.id} className="flex items-center gap-4 px-4 py-3.5 sm:px-6">
                <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${rs.badge}`}>
                  {rank}
                </span>
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-ink-700">
                  {e.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-400">
                      {e.username[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{name(e)}</div>
                </div>
                <div className="text-right text-sm font-semibold text-slate-200">
                  {formatScore(e.score, board.currency)}
                </div>
                {e.prize ? (
                  <div className="w-16 text-right text-sm font-bold" style={{ color: accent }}>
                    {e.prize}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </section>

      {/* Rules */}
      {board.rules ? (
        <section className="card mt-6 p-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-300">Leaderboard Rules</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-400">{board.rules}</p>
        </section>
      ) : null}

      {/* Socials */}
      {Object.keys(socials).length > 0 ? (
        <section className="mt-6 flex flex-wrap justify-center gap-2">
          {Object.entries(socials).map(([k, url]) =>
            url ? (
              <a key={k} href={url} target="_blank" rel="noreferrer" className="btn-ghost text-xs">
                {SOCIAL_LABELS[k.toLowerCase()] || k}
              </a>
            ) : null
          )}
        </section>
      ) : null}

      <footer className="mt-12 text-center text-xs text-slate-600">
        Powered by <span className="font-semibold text-slate-400">Podium</span>
      </footer>
    </div>
  );
}
