# ለነገ CPA — Admin Dashboard

Internal admin console for the ለነገ CPA platform. A separate, lightweight React SPA (Vite, no
SSR) that talks to the same backend REST API as `cpa-hub`, using its own `/api/admin/*` routes and
its own admin login (created via `backend/npm run create-admin` — there is no public signup).

## Setup

```bash
cp .env.example .env   # VITE_API_URL, defaults to http://localhost:5001/api
npm install
npm run dev              # http://localhost:5174
```

## Pages

- **Overview** — platform-wide stats (merchants, campaigns, escrow, payouts, conversions)
- **Merchants** — list, enable/disable
- **Campaigns** — list across all merchants, pause/resume
- **Influencers** — Telegram users, balances, conversion counts
- **Transactions** — recent click/conversion sessions

## Deployment

Built as static files (`npm run build` → `dist/`) and served directly by Nginx — see
[`../deploy/DEPLOYMENT.md`](../deploy/DEPLOYMENT.md) step 5 and `../deploy/nginx/ad.conf`.
