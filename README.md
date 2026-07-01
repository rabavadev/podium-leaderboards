# ◆ Podium — Subscription Leaderboard SaaS

Host beautiful, live, editable leaderboards — and **charge for it**. Built for casino
affiliates, streamers, esports and communities (the Stake/affiliate wager-leaderboard
pattern), but as a proper multi-tenant SaaS you run yourself.

Customers sign up, get their own dashboard, and manage their own boards. Free plan gets
one board; Pro unlocks unlimited via a Stripe subscription. Board owners can hand out
private **editor links** so a mod updates the numbers without any password.

![stack](https://img.shields.io/badge/Next.js-14-black) ![db](https://img.shields.io/badge/Prisma-SQLite%2FPostgres-blue) ![pay](https://img.shields.io/badge/Stripe-subscriptions-635bff) ![style](https://img.shields.io/badge/Tailwind-3-38bdf8)

---

## What's inside

- **Multi-tenant accounts** — email/password signup & login (scrypt-hashed, signed
  session cookies). Each user only sees and edits their own boards.
- **Stripe subscriptions** — Checkout for upgrades, Billing Portal for managing/cancelling,
  and a webhook that keeps each account's plan in sync automatically.
- **Plan gating** — Free = 1 board, Pro = unlimited. Enforced server-side.
- **Public leaderboard pages** at `/<slug>` — podium for the top 3, prize pool, promo code,
  CTA, rules, socials, optional username masking.
- **Delegated editor links** — `/edit/<token>` lets a client/mod update one board's entries
  with no account. Revocable.
- **Bulk import** (paste `username, score, prize`) + **ingest API** (`POST /api/ingest/<key>`).
- **Platform admin** — set `PLATFORM_ADMIN_EMAIL`; that account sees every user & plan.
- Runs **without Stripe** too (Free plan only) so you can develop before wiring payments.

---

## Quickstart (local, no Stripe needed)

Requires Node 18+ or Bun. SQLite by default — no database to set up.

```bash
npm install
cp .env.example .env          # edit SESSION_SECRET
npm run setup                 # prisma generate + db push + seed demo data
npm run dev
```

- Landing + pricing:  http://localhost:3000
- Sign up:            http://localhost:3000/signup
- Demo login:         `demo@podium.local` / `demopass123`
- Demo public board:  http://localhost:3000/chuckybtz

The seed prints the demo board's editor link and API key.

---

## Turning on subscriptions (Stripe)

1. Create a **Product + recurring Price** in your Stripe dashboard → copy the `price_...` ID.
2. In `.env` set:
   ```
   STRIPE_SECRET_KEY=sk_live_or_test_...
   STRIPE_PRICE_ID=price_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   ```
3. Add a webhook endpoint in Stripe pointing at `https://your-domain.com/api/stripe/webhook`,
   subscribed to: `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`. Copy its signing
   secret into `STRIPE_WEBHOOK_SECRET`.
4. Deploy. The **Upgrade to Pro** button on `/dashboard/billing` now runs real checkout.

> Local webhook testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

**Heads up on casino-adjacent billing:** Stripe reviews gambling-related businesses
carefully. Affiliate leaderboards usually aren't "gambling," but be ready to explain your
model. Paddle is a common alternative if Stripe declines.

---

## Config reference (`.env`)

| Variable                | Purpose                                                            |
| ----------------------- | ----------------------------------------------------------------- |
| `DATABASE_URL`          | `file:./dev.db` (SQLite) or a `postgresql://...` URL               |
| `SESSION_SECRET`        | Long random string signing session cookies                        |
| `NEXT_PUBLIC_APP_URL`   | Public base URL for Stripe redirects + share links                |
| `PLATFORM_ADMIN_EMAIL`  | Account that becomes platform admin on signup (optional)          |
| `STRIPE_SECRET_KEY`     | Stripe secret key (blank = billing off, Free plan only)           |
| `STRIPE_PRICE_ID`       | Recurring Price ID for the Pro plan                               |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret                                            |

### Postgres for production
In `prisma/schema.prisma` change `provider = "sqlite"` → `"postgresql"`, set `DATABASE_URL`,
run `npx prisma db push`. (SQLite won't persist on serverless hosts like Vercel.)

---

## The ingest API

```bash
curl -X POST https://your-domain.com/api/ingest/<apiKey> \
  -H "Content-Type: application/json" \
  -d '{"replace": true, "entries": [
    {"username":"moonshines","score":140207.74,"prize":"$1350"}
  ]}'
```

`"replace": false` upserts by username instead of wiping. `GET /api/ingest/<apiKey>`
returns current standings as JSON. Each board's key lives in **Manage board → Share & integrate**.

---

## Routes

```
/                         Landing + pricing
/signup, /login           Account creation + auth
/dashboard                Your boards (plan-gated create)
/dashboard/boards/[id]    Board editor (owner)
/dashboard/billing        Plan + Stripe checkout / portal
/dashboard/admin          Platform admin (all accounts)
/[slug]                   Public leaderboard page
/edit/[token]             Delegated editor (no account)
/api/ingest/[apiKey]      Programmatic entry ingest
/api/stripe/webhook       Stripe subscription sync
```

---

## Deploy

- **Railway / Render / Fly / VPS** — works as-is with Postgres. `npm run build && npm start`.
- **Vercel** — use hosted Postgres (Neon/Supabase), switch Prisma provider to `postgresql`.

## License

MIT.
