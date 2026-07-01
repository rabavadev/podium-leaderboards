# ◆ Podium — Leaderboard Hosting SaaS

Host beautiful, live, editable leaderboards. Built for **casino affiliates, streamers,
esports, and communities** — the same pattern as Stake/affiliate wager leaderboards, but
self-hostable and yours.

Spin up a branded public board in minutes, then keep it fresh by hand, by CSV paste, or
by API. Hand out a private **editor link** so someone can update the numbers without ever
touching your admin password.

![stack](https://img.shields.io/badge/Next.js-14-black) ![db](https://img.shields.io/badge/Prisma-SQLite%2FPostgres-blue) ![style](https://img.shields.io/badge/Tailwind-3-38bdf8)

---

## Features

- **Public leaderboard pages** at `/<slug>` — podium for the top 3, full ranked list,
  prize pool badge, promo code, CTA button, rules, and social links.
- **Multi-board** — host as many leaderboards as you want from one install.
- **Admin dashboard** at `/admin` — password protected. Create boards, edit branding,
  manage entries, reorder by score.
- **Delegated editor links** — share `/edit/<token>` so a client/mod can update a single
  board's entries without the master password. Revoke any time.
- **Bulk import** — paste `username, score, prize` rows (e.g. a casino wager CSV export);
  existing players are updated, new ones added.
- **Ingest API** — `POST /api/ingest/<apiKey>` to push entries programmatically (replace
  or upsert). Great for automating from a spreadsheet, sheet, or affiliate export.
- **Username masking** — show `mo*****es` instead of full names, toggle per board.
- **Custom accent color**, logo, subtitle, currency symbol per board.
- Dark, casino-grade UI out of the box. Zero external services to run locally.

---

## Quickstart

Requires Node 18+ (or Bun). Uses SQLite by default — no database to set up.

```bash
# 1. Install deps
npm install

# 2. Create your .env
cp .env.example .env
#   then edit ADMIN_PASSWORD and SESSION_SECRET

# 3. Create the DB, generate the client, and load a demo board
npm run setup        # = prisma generate + db push + seed

# 4. Run it
npm run dev
```

- Public demo board: http://localhost:3000/chuckybtz
- Admin: http://localhost:3000/admin  (password = your `ADMIN_PASSWORD`)
- Landing: http://localhost:3000

> The seed script prints the demo board's editor link and API key to the console.

---

## Configuration (`.env`)

| Variable         | What it does                                                        |
| ---------------- | ------------------------------------------------------------------- |
| `DATABASE_URL`   | `file:./dev.db` for SQLite, or a `postgresql://...` URL for Postgres |
| `ADMIN_PASSWORD` | Master password for `/admin`                                        |
| `SESSION_SECRET` | Long random string used to sign the admin session cookie            |

### Using Postgres (recommended for production)

1. In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`.
2. Set `DATABASE_URL` to your Postgres connection string.
3. Run `npx prisma db push`.

---

## The ingest API

Push a full snapshot (wipe + insert):

```bash
curl -X POST https://your-domain.com/api/ingest/<apiKey> \
  -H "Content-Type: application/json" \
  -d '{
    "replace": true,
    "entries": [
      { "username": "moonshines", "score": 140207.74, "prize": "$1350" },
      { "username": "queenchess", "score": 78730.72,  "prize": "$750"  }
    ]
  }'
```

Or upsert by username (`"replace": false`) to update scores without removing anyone.
`GET /api/ingest/<apiKey>` returns the current ranked standings as JSON.

Find each board's API key and editor link in **Admin → Manage board → Share & integrate**.

---

## Deploy

- **Railway / Render / Fly / a VPS** — works as-is. Set the env vars, use Postgres,
  run `npm run build && npm start`.
- **Vercel** — set `DATABASE_URL` to a hosted Postgres (Neon, Supabase, Vercel Postgres),
  switch the Prisma provider to `postgresql`, and deploy. (SQLite won't persist on
  serverless.)

---

## Project structure

```
prisma/schema.prisma        Board + Entry models
src/app/page.tsx            Landing + list of public boards
src/app/[slug]/page.tsx     Public leaderboard page
src/app/admin/...           Password-protected dashboard
src/app/edit/[token]/...    Delegated editor (no admin password)
src/app/api/ingest/...      Programmatic ingest endpoint
src/components/             LeaderboardView (public), BoardEditor (admin/editor)
src/lib/                    db, auth (signed cookie), server actions, formatting
```

---

## Roadmap ideas

- Per-customer accounts + billing (true multi-tenant SaaS)
- Automatic monthly reset + prize archiving / past-winners page
- Live wager sync integrations
- Embeddable widget (`<iframe>`) for existing sites

---

## License

MIT — do whatever you want. Attribution appreciated but not required.
