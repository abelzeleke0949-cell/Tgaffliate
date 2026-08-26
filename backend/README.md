# Gulit CPA — Backend API

Node.js + Express + MongoDB (Mongoose) + Telegraf. See the root [`README.md`](../README.md) for
the full project overview and [`../deploy/DEPLOYMENT.md`](../deploy/DEPLOYMENT.md) for production
setup.

## Setup

```bash
cp .env.example .env   # fill in JWT_SECRET, CHAPA_SECRET_KEY, CHAPA_WEBHOOK_SECRET at minimum
npm install
npm run seed            # optional: sample merchant + campaigns
npm run create-admin    # create an admin login
npm run dev              # http://localhost:5001
```

## Auth model

Two separate JWT-protected identities share this API:

- **Merchant** — self-registers via `/api/auth/register`, manages their own wallet and campaigns.
- **Admin** — created only via `npm run create-admin` (no public signup), manages the whole platform.

Send the JWT as `Authorization: Bearer <token>` on protected routes.

## Endpoints

### Auth (merchant)
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create a merchant account, returns a JWT |
| POST | `/api/auth/login` | Public | Log in, returns a JWT |
| GET | `/api/auth/me` | Merchant | Current merchant's profile |

### Merchant wallet
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/merchant/me` | Merchant | Profile + campaign summary |
| POST | `/api/merchant/deposit/initialize` | Merchant | `{ amount }` — starts a real Chapa checkout, returns `{ checkoutUrl }` |
| GET | `/api/merchant/deposit/verify/:txRef` | Merchant | Re-verifies with Chapa and credits the wallet (idempotent) |

### Campaigns
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/campaigns?isActive=true` | Public | Active campaigns (used by the Mini App) |
| GET | `/api/campaigns/mine/list` | Merchant | The logged-in merchant's own campaigns (any status) |
| GET | `/api/campaigns/:id` | Public | Single campaign |
| GET | `/api/campaigns/:id/stats` | Public | Budget/conversion stats for one campaign |
| POST | `/api/campaigns` | Merchant | `{ productName, totalBudget, cpaReward, ... }` — escrows budget |
| PUT | `/api/campaigns/:id` | Merchant (owner) | Update `isActive` / `productDescription` / `productPrice` |

### Webhooks
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/webhooks/chapa-mock` | `X-Webhook-Secret` header | `{ buyerTelegramId, campaignId }` — processes a conversion |
| POST | `/api/webhooks/chapa` | Public (re-verifies server-to-server) | Chapa's payment callback for wallet deposits |
| POST | `/api/webhooks/track-click` | Public | Optional click analytics |

### Users (influencers/buyers)
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/users` | Public | Create/update a Telegram user profile |
| GET | `/api/users/influencers/leaderboard` | Public | Top influencers by earnings |
| GET | `/api/users/:telegramId` | Public | Profile + click/conversion stats |
| GET | `/api/users/:telegramId/earnings` | Public | Earnings history |

### Admin
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/admin/login` | Public | Log in, returns a JWT |
| GET | `/api/admin/stats` | Admin | Platform-wide totals |
| GET | `/api/admin/merchants` | Admin | All merchants |
| PATCH | `/api/admin/merchants/:id` | Admin | `{ isActive }` — enable/disable a merchant |
| GET | `/api/admin/campaigns` | Admin | All campaigns, any merchant |
| PATCH | `/api/admin/campaigns/:id` | Admin | `{ isActive }` — pause/resume a campaign |
| GET | `/api/admin/users` | Admin | All influencer/buyer profiles |
| GET | `/api/admin/sessions` | Admin | Recent click/conversion sessions |

## Telegram bot

Commands: `/start` (parses `inf_<telegramId>_camp_<campaignId>` deep links, opens the Mini App),
`/balance`, `/help`. Runs on long polling in development; switches to a webhook automatically when
`NODE_ENV=production` and `TELEGRAM_WEBHOOK_DOMAIN` are set (see `src/services/telegramService.js`).

## Security notes

- Passwords are hashed with bcrypt; JWTs are signed with `JWT_SECRET` (set a long random value in
  production — see `.env.example`).
- `helmet`, per-route rate limiting (`express-rate-limit`), and NoSQL-injection sanitization
  (`express-mongo-sanitize`) are applied globally in `src/server.js`.
- CORS only allows the origins listed in `CORS_ORIGINS`.
- The mock Chapa webhook requires an `X-Webhook-Secret` header matching `CHAPA_WEBHOOK_SECRET`,
  standing in for real payment-gateway signature verification.
- Real wallet deposits (`/api/merchant/deposit/*`, `/api/webhooks/chapa`) never trust a client
  redirect or webhook body — every credit is preceded by an independent server-to-server call to
  Chapa's `/transaction/verify` endpoint using `CHAPA_SECRET_KEY`, and is idempotent per `tx_ref`.
