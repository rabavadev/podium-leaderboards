# ◆ Podium — Leaderboard Hosting SaaS (subscription-ready)

Host beautiful, live, editable leaderboards and charge for it. Built for **casino
affiliates, streamers, esports, and communities** — the same pattern as Stake/affiliate
wager leaderboards, but self-hostable and yours.

Customers sign up, get a dashboard, create branded public leaderboards, and update them
by hand, CSV, or API. **Free** plan = 1 board; **Pro** = unlimited, billed monthly via
Stripe. You (the host) get a `/host` panel to see every user, every board, and flip plans.

![stack](https://img.shields.io/badge/Next.js-14-black) ![db](https://img.shields.io/badge/Prisma-SQLite%2FPostgres-blue) ![billing](https://img.shields.io/badge/Stripe-subscriptions-635bff)

---

## Features

### For customers
- **Sign up / log in** with email + password (scrypt-hashed, signed-cookie sessions).
- **Personal dashboard** at `/dashboard` — create and manage their own boards.
- **Public leaderboard pages** at `/<slug>` — podium for top 3, ranked list, prize pool,
  promo code, CTA button, rules, social links, masked usernames.
- **Delegated editor links** — share `/edit/<token>` so a mod/client can update a single
  board's entries without logging in. Revoke any time.
- **Bulk import** — paste `username, score, prize` rows; upserts by username.
- **Ingest API** — `POST /api/ingest/<apiKey>` to push entries programmatically.
- **Plan + billing** — upgrade to Pro via Stripe Checkout, manage/cancel via the Stripe
  customer portal.

### For the host (you)
- **`/host` panel** — every user (email, plan, board count, Stripe status), every board
  across the whole instance.
- **Flip plans** manually (gift someone Pro) or **delete users**.
- **Stripe webhooks** auto-sync subscription status back to each user.
- The host is auto-Pro and can manage any board on the instance.

---

## Quickstart

Requires Node 18+ (or Bun). Uses SQLite by default.

```bash
# 1. Install deps
npm install

# 2. Configure env
cp .env.example .env
#   - set SESSION_SECRET (long random string)
#   - set HOST_EMAIL to YOUR email so your signup becomes the host
#   - leave Stripe fields blank for now (works in "no billing" mode)

# 3. Create the DB and seed a demo leaderboard
npm run setup

# 4. Run it
npm run dev
```

- **Sign up** at http://localhost:3000/signup (use the `HOST_EMAIL` you set → you become host)
- **Your dashboard**: http://localhost:3000/dashboard
- **Host panel**: http://localhost:3000/host
- **Demo board**: http://localhost:3000/chuckybtz

> If `HOST_EMAIL` is unset, the **first** person to sign up becomes the host automatically.

---

## Turning on billing (Stripe)

1. Create a **recurring Product** in Stripe (e.g. "Podium Pro") with a monthly **Price**.
   Copy the price id (`price_...`).
2. Get your **Secret API key** (`sk_...` or `sk_test_...`).
3. Create a **Webhook endpoint** pointing to `https://YOUR_DOMAIN/api/stripe-webhook`,
   listening for `checkout.session.completed` and `customer.subscription.*` events.
   Copy the **signing secret** (`whsec_...`).
4. Fill these in `.env`:

```
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRO_PRICE_ID="price_..."
NEXT_PUBLIC_SITE_URL="https://YOUR_DOMAIN"
HOST_EMAIL="you@yoursite.com"
```

5. Restart the app. Customers now see **Upgrade to Pro** → Stripe Checkout. Cancelling in
   the portal flips them back to Free automatically.

> **Local webhook testing:** run `stripe listen --forward-to localhost:3000/api/stripe-webhook`
> and use the `whsec_...` it prints as `STRIPE_WEBHOOK_SECRET`.

---

## Plan limits

| Plan  | Boards         | Price           |
| ----- | -------------- | --------------- |
| Free  | 1              | $0              |
| Pro   | unlimited      | your Stripe Price |
| Host  | unlimited      | always Pro      |

Limits are enforced in `src/lib/stripe.ts` (`boardLimit()`) and checked in
`createBoardAction`. Adjust freely.

---

## The ingest API

```bash
# Replace all entries
curl -X POST https://YOUR_DOMAIN/api/ingest/<apiKey> \
  -H "Content-Type: application/json" \
  -d '{"replace":true,"entries":[
    {"username":"moonshines","score":140207.74,"prize":"$1350"}
  ]}'

# Upsert by username (replace:false)
# GET returns current ranked standings
curl https://YOUR_DOMAIN/api/ingest/<apiKey>
```

Each board's API key + editor link live in **Dashboard → Manage board → Share & integrate**.

---

## Configuration (`.env`)

| Variable                | What it does                                                        |
| ----------------------- | ------------------------------------------------------------------- |
| `DATABASE_URL`          | `file:./dev.db` (SQLite) or `postgresql://...`                      |
| `HOST_EMAIL`            | Email of the site operator — gets host powers on signup             |
| `STRIPE_SECRET_KEY`     | Stripe secret key (optional for dev)                                |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret                                              |
| `STRIPE_PRO_PRICE_ID`   | Recurring price id for the Pro plan                                 |
| `NEXT_PUBLIC_SITE_URL`  | Public URL (checkout success/cancel redirects)                      |
| `SESSION_SECRET`        | Long random string for signing session cookies                      |

### Postgres for production

1. In `prisma/schema.prisma`, set `provider = "postgresql"`.
2. Set `DATABASE_URL` to your Postgres connection string.
3. `npx prisma db push`.

---

## Deploy

- **Railway / Render / Fly / VPS** — set env vars, use Postgres, `npm run build && npm start`.
- **Vercel** — hosted Postgres (Neon/Supabase), switch provider to `postgresql`, deploy.
  SQLite won't persist on serverless.

> Casino-adjacent SaaS: Stripe may review the account. Podium itself isn't gambling — it's
> a leaderboard tool — but affiliate branding can trigger extra questions. Have your
> business description ready. Alternatives: Paddle, LemonSqueezy, crypto (Coinbase Commerce).

---

## Project structure

```
prisma/schema.prisma            User (accounts, Stripe, plan) + Board + Entry
src/app/page.tsx                Landing + list of public boards
src/app/[slug]/page.tsx         Public leaderboard page
src/app/signup, /login          Customer auth
src/app/dashboard/...           Customer dashboard + board manager
src/app/host/...                Host admin panel (all users + boards)
src/app/edit/[token]/...        Delegated editor (no login)
src/app/api/ingest/...          Ingest API
src/app/api/stripe-webhook      Stripe → plan sync
src/components/                 LeaderboardView (public), BoardEditor (dashboard/editor)
src/lib/                        db, auth (scrypt + sessions), stripe, server actions, format
```

---

## License

MIT — do whatever you want. Attribution appreciated but not required.
