# Deployment — Hostinger VPS + Cloudflare (lightb.tech)

VPS IP: `186.241.20.75`

## 1. Cloudflare DNS

Dashboard → `lightb.tech` → DNS → Records → Add record (×3, Proxy status: Proxied):

| Type | Name | Content |
|---|---|---|
| A | `app` | `186.241.20.75` |
| A | `api` | `186.241.20.75` |
| A | `ad` | `186.241.20.75` |

## 2. Cloudflare SSL/TLS mode

Dashboard → SSL/TLS → Overview → **Flexible**

Cloudflare terminates HTTPS for visitors and talks to the VPS over plain HTTP, so no origin
certificate is needed on the server at all. (Traffic between Cloudflare and the VPS is
unencrypted — acceptable for most setups, but if that ever matters, switch to Full (strict) with
a Cloudflare Origin CA certificate instead, and add the `ssl_certificate`/`ssl_certificate_key`
lines back to the nginx configs in step 4.)

## 3. (skipped — no origin certificate needed in Flexible mode)

## 4. Nginx real-IP restoration

```bash
sudo cp deploy/nginx/cloudflare-realip.conf /etc/nginx/conf.d/cloudflare-realip.conf
```

## 5. Base server setup

```bash
sudo apt update && sudo apt upgrade -y

curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

sudo npm install -g pm2
sudo apt install -y nginx

sudo ufw allow OpenSSH
sudo ufw allow "Nginx Full"
sudo ufw enable

sudo ss -ltnp | grep -E ':(3001|5001)\s'   # confirm no output
```

## 6. MongoDB

Follow `deploy/mongodb-setup.md`.

## 7. Get the code onto the server

```bash
cd /var/www
sudo mkdir -p cpa-hub-platform && sudo chown $USER:$USER cpa-hub-platform
cd cpa-hub-platform
git clone <your-repo-url> .
```

## 8. Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
NODE_ENV=production
MONGODB_URI=<from deploy/mongodb-setup.md step 5 — mongodb://127.0.0.1:27017/cpa-hub if using the no-auth option>
JWT_SECRET=a2979304b6baca3c370333422dd0e1ddc9441af861b6a1ff19c41176852cac42b7d63894795d9946375e43f7ebf4ccc8
CORS_ORIGINS=https://app.lightb.tech,https://ad.lightb.tech
CHAPA_WEBHOOK_SECRET=<random string>
FRONTEND_URL=https://app.lightb.tech
MINI_APP_URL=https://app.lightb.tech/miniapp
TELEGRAM_BOT_TOKEN=<from @BotFather>
TELEGRAM_WEBHOOK_DOMAIN=https://api.lightb.tech
```

```bash
npm install --omit=dev
npm run seed
npm run create-admin
```

## 9. Brand dashboard (cpa-hub)

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
npm run build
```

## 10. Admin dashboard

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
npm run build
sudo mkdir -p /var/www/cpa-hub-admin
sudo cp -r dist/* /var/www/cpa-hub-admin/
```

## 11. PM2

```bash
cd /var/www/cpa-hub-platform
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

```bash
pm2 status
curl http://127.0.0.1:5001/health
curl http://127.0.0.1:3001
```

## 12. Nginx site configs

```bash
sudo cp deploy/nginx/app.conf /etc/nginx/sites-available/app.conf
sudo cp deploy/nginx/api.conf /etc/nginx/sites-available/api.conf
sudo cp deploy/nginx/ad.conf /etc/nginx/sites-available/ad.conf

sudo ln -s /etc/nginx/sites-available/app.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/api.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/ad.conf /etc/nginx/sites-enabled/

sudo nginx -t && sudo systemctl reload nginx
```

## 13. Verify

```bash
curl -sI https://app.lightb.tech | grep -i cf-ray
```

- `https://app.lightb.tech` — register/login, top up wallet, launch campaign, refresh persists
- `https://app.lightb.tech/miniapp` — generate affiliate link, buyer checkout
- `https://ad.lightb.tech` — sign in with `create-admin` account, stats/tables load
- Telegram bot `/start` replies

## 14. Redeploy after changes

```bash
cd /var/www/cpa-hub-platform
git pull
cd backend && npm install --omit=dev && cd ..
cd cpa-hub && npm install && npm run build && cd ..
cd admin-dashboard && npm install && npm run build && sudo cp -r dist/* /var/www/cpa-hub-admin/ && cd ..
pm2 restart ecosystem.config.cjs --env production
```
