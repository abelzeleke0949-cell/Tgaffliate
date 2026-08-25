# Deploying Gulit CPA to the Hostinger VPS (lightb.tech)

Three things get deployed, as new subdomains on your existing `lightb.tech` zone, fronted by
Cloudflare:

| App | What it is | Runs as | Public URL |
|---|---|---|---|
| `cpa-hub` | Brand dashboard + Telegram Mini App (TanStack Start, SSR) | Node process on :3001 | `https://app.lightb.tech` |
| `backend` | REST API + Telegram bot (Express) | Node process on :5001 | `https://api.lightb.tech` |
| `admin-dashboard` | Internal admin console (static SPA) | Static files via Nginx | `https://ad.lightb.tech` |

All three share one MongoDB database on the VPS. Nginx terminates TLS using a Cloudflare Origin
CA certificate (Cloudflare terminates the public-facing TLS at its edge); this only adds new
hostnames and doesn't touch whatever else is already live on `lightb.tech`.

**Do `deploy/cloudflare-setup.md` first** (DNS records, SSL/TLS mode, Origin CA cert, real-IP
restoration) — everything below assumes that's done.

## 1. Base server setup (once)

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# PM2 (process manager) and Nginx
sudo npm install -g pm2
sudo apt install -y nginx

# Firewall — only SSH, HTTP, HTTPS reachable from outside.
# Cloudflare proxies traffic to 80/443 same as any other site on this box.
sudo ufw allow OpenSSH
sudo ufw allow "Nginx Full"
sudo ufw enable
```

Confirm :3001 and :5001 (used below) are actually free on this box — they were chosen to avoid
the site you already have on :3000/:5000, but worth a check if you're running anything else too:

```bash
sudo ss -ltnp | grep -E ':(3001|5001)\s'   # no output = both free
```

Then follow `deploy/mongodb-setup.md` to install and secure MongoDB (self-hosted, password
protected, bound to localhost only).

## 2. Get the code onto the server

```bash
cd /var/www
sudo mkdir -p cpa-hub-platform && sudo chown $USER:$USER cpa-hub-platform
cd cpa-hub-platform
git clone <your-repo-url> .
```

(If you don't have this in one git repo, `scp -r` the `cpa-hub/`, `backend/`, `admin-dashboard/`
folders plus `ecosystem.config.cjs` and `deploy/` from your machine instead.)

## 3. Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
NODE_ENV=production
MONGODB_URI=<from deploy/mongodb-setup.md step 5>
JWT_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
CORS_ORIGINS=https://app.lightb.tech,https://ad.lightb.tech
CHAPA_WEBHOOK_SECRET=<another random string>
FRONTEND_URL=https://app.lightb.tech
MINI_APP_URL=https://app.lightb.tech/miniapp
TELEGRAM_BOT_TOKEN=<from @BotFather>
TELEGRAM_WEBHOOK_DOMAIN=https://api.lightb.tech
```

```bash
npm install --omit=dev
npm run seed          # optional: sample merchant + campaigns
npm run create-admin  # create your first admin login
```

## 4. Brand dashboard (cpa-hub)

```bash
cd ../cpa-hub
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=https://api.lightb.tech/api
VITE_CHAPA_WEBHOOK_SECRET=<same value as backend's CHAPA_WEBHOOK_SECRET>
```

```bash
npm install
npm run build   # outputs .output/server/index.mjs (preset: node-server, see vite.config.ts)
```

## 5. Admin dashboard

```bash
cd ../admin-dashboard
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=https://api.lightb.tech/api
```

```bash
npm install
npm run build   # outputs dist/
sudo mkdir -p /var/www/cpa-hub-admin
sudo cp -r dist/* /var/www/cpa-hub-admin/
```

Re-run the copy after every future admin-dashboard rebuild.

## 6. Telegram bot

1. Talk to [@BotFather](https://t.me/botfather), `/newbot`, copy the token into `backend/.env`
   (done in step 3).
2. `/setmenubutton` (optional) → point it at `https://app.lightb.tech/miniapp` as a Web App button.
3. With `NODE_ENV=production` and `TELEGRAM_WEBHOOK_DOMAIN=https://api.lightb.tech` set, the
   backend registers a Telegram webhook at `https://api.lightb.tech/api/telegram/webhook` on
   startup instead of polling — no extra step beyond `api.lightb.tech` being live over HTTPS
   (step 8) before you start the backend process (step 7).

## 7. Start everything with PM2

From the repo root:

```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup   # follow the printed command to enable PM2 on boot
```

Check both processes are healthy:

```bash
pm2 status
curl http://127.0.0.1:5001/health
curl http://127.0.0.1:3001
```

## 8. Nginx

(Cloudflare DNS, SSL/TLS mode, and the Origin CA cert at `/etc/ssl/cloudflare/lightb.tech.*`
should already exist from `deploy/cloudflare-setup.md`.)

```bash
sudo cp deploy/nginx/app.conf /etc/nginx/sites-available/app.conf
sudo cp deploy/nginx/api.conf /etc/nginx/sites-available/api.conf
sudo cp deploy/nginx/ad.conf /etc/nginx/sites-available/ad.conf

sudo ln -s /etc/nginx/sites-available/app.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/api.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/ad.conf /etc/nginx/sites-enabled/

sudo nginx -t && sudo systemctl reload nginx
```

No certbot needed — Cloudflare terminates public TLS at its edge, and Nginx presents the
Cloudflare Origin CA cert for the Cloudflare-to-origin leg (Full strict mode).

## 9. Verify

- `https://app.lightb.tech` — brand dashboard login/register works, launching a campaign and
  topping up the wallet both persist after a page refresh.
- `https://app.lightb.tech/miniapp` — influencer link generation and the buyer checkout flow work.
- `https://ad.lightb.tech` — sign in with the account from `npm run create-admin`, confirm
  stats/merchants/campaigns/users/transactions all load.
- Open your bot in Telegram, send `/start`, confirm it replies (webhook is live).
- `curl -sI https://app.lightb.tech | grep -i cf-ray` — presence of a `cf-ray` header confirms
  the request actually went through Cloudflare.

## 10. Redeploying after changes

```bash
cd /var/www/cpa-hub-platform
git pull
cd backend && npm install --omit=dev && cd ..
cd cpa-hub && npm install && npm run build && cd ..
cd admin-dashboard && npm install && npm run build && sudo cp -r dist/* /var/www/cpa-hub-admin/ && cd ..
pm2 restart ecosystem.config.cjs --env production
```

## Notes / current limitations

- `POST /api/webhooks/chapa-mock` still simulates Chapa rather than calling the real gateway —
  swap `backend/src/controllers/webhookController.js` for a real Chapa integration when you're
  ready to accept live payments; the escrow/conversion/notification logic around it stays the same.
- There's no influencer withdrawal flow yet — `earningsBalance` accumulates in MongoDB but nothing
  pays it out. That's the next major feature to build before onboarding real influencers.
- Admin dashboard has no additional access control beyond its own login. See the Cloudflare
  Access note at the bottom of `deploy/cloudflare-setup.md` for a second layer.
