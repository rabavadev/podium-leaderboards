import {
  updateBoardAction,
  addEntryAction,
  updateEntryAction,
  deleteEntryAction,
  bulkImportAction,
  deleteBoardAction,
  regenerateSecretAction,
} from "@/lib/actions";
import { parseSocials } from "@/lib/format";

type Entry = {
  id: string;
  username: string;
  score: number;
  prize: string;
  avatarUrl: string;
};

type Board = {
  id: string;
  slug: string;
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
  isPublic: boolean;
  editorToken: string;
  apiKey: string;
};

const SOCIAL_KEYS = ["kick", "youtube", "twitch", "instagram", "discord", "telegram", "x", "tiktok", "website"];

export function BoardEditor({
  board,
  entries,
  canManageSocials,
  token,
  baseUrl,
}: {
  board: Board;
  entries: Entry[];
  canManageSocials: boolean;
  token?: string;
  baseUrl: string;
}) {
  const socials = parseSocials(board.socials);
  const tokenField = token ? <input type="hidden" name="token" value={token} /> : null;

  return (
    <div className="space-y-8">
      {/* Board settings */}
      <section className="card p-6">
        <h2 className="mb-4 text-lg font-bold text-white">Board settings</h2>
        <form action={updateBoardAction} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={board.id} />
          {tokenField}

          <div className="sm:col-span-2">
            <label className="label">Title</label>
            <input className="input" name="title" defaultValue={board.title} />
          </div>

          {canManageSocials ? (
            <div>
              <label className="label">Slug (public URL)</label>
              <input className="input" name="slug" defaultValue={board.slug} />
            </div>
          ) : null}

          <div>
            <label className="label">Subtitle</label>
            <input className="input" name="subtitle" defaultValue={board.subtitle} />
          </div>

          <div className="sm:col-span-2">
            <label className="label">Description / promo blurb</label>
            <textarea className="input min-h-[80px]" name="description" defaultValue={board.description} />
          </div>

          <div className="sm:col-span-2">
            <label className="label">Rules</label>
            <textarea className="input min-h-[80px]" name="rules" defaultValue={board.rules} />
          </div>

          <div>
            <label className="label">Prize pool label</label>
            <input className="input" name="prizePool" defaultValue={board.prizePool} placeholder="$3,500 Monthly" />
          </div>
          <div>
            <label className="label">Currency symbol</label>
            <input className="input" name="currency" defaultValue={board.currency} />
          </div>

          <div>
            <label className="label">Promo code</label>
            <input className="input" name="promoCode" defaultValue={board.promoCode} />
          </div>
          <div>
            <label className="label">Accent color</label>
            <input className="input h-11" type="color" name="accentColor" defaultValue={board.accentColor} />
          </div>

          <div>
            <label className="label">CTA button text</label>
            <input className="input" name="ctaText" defaultValue={board.ctaText} placeholder="Sign up on Stake" />
          </div>
          <div>
            <label className="label">CTA button URL</label>
            <input className="input" name="ctaUrl" defaultValue={board.ctaUrl} placeholder="https://..." />
          </div>

          <div className="sm:col-span-2">
            <label className="label">Logo URL</label>
            <input className="input" name="logoUrl" defaultValue={board.logoUrl} placeholder="https://..." />
          </div>

          {canManageSocials ? (
            <div className="sm:col-span-2">
              <label className="label">Social links</label>
              <div className="grid gap-2 sm:grid-cols-3">
                {SOCIAL_KEYS.map((k) => (
                  <input
                    key={k}
                    className="input"
                    name={`social_${k}`}
                    defaultValue={socials[k] ?? ""}
                    placeholder={k}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-6 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name="maskNames" defaultChecked={board.maskNames} className="h-4 w-4" />
              Mask usernames (t*****t)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name="isPublic" defaultChecked={board.isPublic} className="h-4 w-4" />
              Public
            </label>
          </div>

          <div className="sm:col-span-2">
            <button className="btn-gold" type="submit">Save settings</button>
          </div>
        </form>
      </section>

      {/* Entries */}
      <section className="card p-6">
        <h2 className="mb-4 text-lg font-bold text-white">Entries ({entries.length})</h2>

        <div className="space-y-2">
          {entries.map((e, i) => (
            <form
              key={e.id}
              action={updateEntryAction}
              className="grid grid-cols-12 items-center gap-2 rounded-xl border border-white/5 bg-ink-900/40 p-2"
            >
              <input type="hidden" name="entryId" value={e.id} />
              {tokenField}
              <span className="col-span-1 text-center text-xs font-bold text-slate-500">{i + 1}</span>
              <input className="input col-span-4" name="username" defaultValue={e.username} />
              <input className="input col-span-3" name="score" type="number" step="any" defaultValue={e.score} />
              <input className="input col-span-2" name="prize" defaultValue={e.prize} placeholder="prize" />
              <input type="hidden" name="avatarUrl" defaultValue={e.avatarUrl} />
              <button className="btn-ghost col-span-1 px-2 py-1.5 text-xs" type="submit">Save</button>
              <button
                className="col-span-1 rounded-lg px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                formAction={deleteEntryAction}
                type="submit"
              >
                Del
              </button>
            </form>
          ))}
        </div>

        {/* Add entry */}
        <form action={addEntryAction} className="mt-4 grid grid-cols-12 items-center gap-2 border-t border-white/5 pt-4">
          <input type="hidden" name="boardId" value={board.id} />
          {tokenField}
          <span className="col-span-1 text-center text-xs text-slate-500">+</span>
          <input className="input col-span-4" name="username" placeholder="username" />
          <input className="input col-span-3" name="score" type="number" step="any" placeholder="score" />
          <input className="input col-span-2" name="prize" placeholder="prize" />
          <button className="btn-gold col-span-2 px-2 py-1.5 text-xs" type="submit">Add</button>
        </form>
      </section>

      {/* Bulk import */}
      <section className="card p-6">
        <h2 className="mb-2 text-lg font-bold text-white">Bulk import</h2>
        <p className="mb-3 text-xs text-slate-400">
          Paste rows as <code className="text-slate-300">username, score, prize</code> (one per line). Existing
          usernames are updated; new ones are added. Great for pasting a wager CSV export.
        </p>
        <form action={bulkImportAction}>
          <input type="hidden" name="boardId" value={board.id} />
          {tokenField}
          <textarea
            className="input min-h-[120px] font-mono text-xs"
            name="csv"
            placeholder={"moonshines, 140207.74, $1350\nqueenchess, 78730.72, $750"}
          />
          <button className="btn-gold mt-3" type="submit">Import rows</button>
        </form>
      </section>

      {/* Admin-only: sharing + danger zone */}
      {canManageSocials ? (
        <section className="card p-6">
          <h2 className="mb-4 text-lg font-bold text-white">Share &amp; integrate</h2>
          <div className="space-y-4 text-sm">
            <div>
              <div className="label">Public page</div>
              <a href={`/${board.slug}`} className="text-gold-400 hover:underline">{baseUrl}/{board.slug}</a>
            </div>

            <div>
              <div className="label">Delegated editor link (no admin password needed)</div>
              <div className="flex items-center gap-2">
                <input className="input font-mono text-xs" readOnly value={`${baseUrl}/edit/${board.editorToken}`} />
                <form action={regenerateSecretAction}>
                  <input type="hidden" name="id" value={board.id} />
                  <input type="hidden" name="which" value="editor" />
                  <button className="btn-ghost whitespace-nowrap text-xs" type="submit">Reset</button>
                </form>
              </div>
            </div>

            <div>
              <div className="label">Ingest API key (POST to update entries programmatically)</div>
              <div className="flex items-center gap-2">
                <input className="input font-mono text-xs" readOnly value={board.apiKey} />
                <form action={regenerateSecretAction}>
                  <input type="hidden" name="id" value={board.id} />
                  <input type="hidden" name="which" value="api" />
                  <button className="btn-ghost whitespace-nowrap text-xs" type="submit">Reset</button>
                </form>
              </div>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-ink-950 p-3 text-[11px] text-slate-400">
{`curl -X POST ${baseUrl}/api/ingest/${board.apiKey} \\
  -H "Content-Type: application/json" \\
  -d '{"replace":true,"entries":[
    {"username":"moonshines","score":140207.74,"prize":"$1350"}
  ]}'`}
              </pre>
            </div>
          </div>

          <div className="mt-6 border-t border-red-500/20 pt-4">
            <form action={deleteBoardAction}>
              <input type="hidden" name="id" value={board.id} />
              <button className="rounded-xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10" type="submit">
                Delete this board
              </button>
            </form>
          </div>
        </section>
      ) : null}
    </div>
  );
}
