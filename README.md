# Gulit CPA — Affiliate Marketplace

A Cost-Per-Action (CPA) affiliate marketplace for the Ethiopian market: brands fund a wallet,
launch pay-per-sale campaigns in ETB, and Telegram influencers earn a commission for every
verified sale they drive.

## Project structure

```
Affiliate Program/
├── cpa-hub/            Brand dashboard + Telegram Mini App (React, TanStack Start, SSR)
├── backend/            REST API + Telegram bot (Node.js, Express, MongoDB, Telegraf)
├── admin-dashboard/     Internal admin console (React SPA) — same backend API
├── ecosystem.config.cjs PM2 process config for production
└── deploy/              Nginx configs, MongoDB setup, and the full VPS deployment guide
```

All three apps talk to the same backend REST API. `cpa-hub` and `admin-dashboard` are
separate frontends with separate logins (merchant accounts vs. admin accounts).

## Local development

**1. MongoDB** — running locally (`mongod` as a service, or `docker run -d -p 27017:27017 mongo:latest`).

**2. Backend**
```bash
cd backend
cp .env.example .env   # set JWT_SECRET and CHAPA_WEBHOOK_SECRET to any random strings
npm install
npm run seed            # sample merchant (coffee@example.com / password123) + 3 campaigns
npm run create-admin    # create an admin login for the admin dashboard
npm run dev              # http://localhost:5001
```

**3. Brand dashboard**
```bash
cd cpa-hub
cp .env.example .env   # VITE_CHAPA_WEBHOOK_SECRET must match the backend's
npm install
npm run dev              # http://localhost:5173 — sign in with the seeded merchant, or register a new one
```

**4. Admin dashboard**
```bash
cd admin-dashboard
cp .env.example .env
npm install
npm run dev              # http://localhost:5174 — sign in with the account from `create-admin`
```

**5. Telegram bot (optional for local dev)** — get a token from
[@BotFather](https://t.me/botfather), add it to `backend/.env` as `TELEGRAM_BOT_TOKEN`, restart
the backend. Without a token the bot simply stays off; the REST API and both dashboards work fine
without it.

## How the money flows

1. A merchant registers, deposits funds (mock Chapa top-up), and launches a campaign — the budget
   is escrowed by deducting it from the wallet immediately.
2. An influencer opens the Mini App, generates an affiliate link
   (`t.me/<bot>?start=inf_<telegramId>_camp_<campaignId>`) and shares it.
3. A buyer clicks the link, the bot creates a `pending` session, and the Mini App opens showing
   that product.
4. "Buy Now" calls `POST /api/webhooks/chapa-mock` (standing in for a real Chapa payment webhook)
   — the session is marked `converted`, the campaign's `budgetRemaining` drops by the CPA reward,
   and the influencer's `earningsBalance` goes up by the same amount, with a Telegram notification
   sent to them.

## Deploying

Deploys to a Hostinger VPS as three subdomains on `lightb.tech`, fronted by Cloudflare:
`app.lightb.tech` (brand dashboard), `api.lightb.tech` (backend), `ad.lightb.tech` (admin
dashboard). See [`deploy/DEPLOYMENT.md`](deploy/DEPLOYMENT.md) (references
[`deploy/mongodb-setup.md`](deploy/mongodb-setup.md) at step 7).

## Known gaps

- `chapa-mock` is a stand-in for the real Chapa payment gateway — swap it out before accepting
  live payments.
- No withdrawal flow for influencers yet — `earningsBalance` accumulates but nothing pays it out.
- The admin dashboard has no access control beyond its own login; put it behind an IP
  allowlist/VPN in production if you want defense in depth (see the note in `deploy/DEPLOYMENT.md`).
