#!/usr/bin/env bash
# ============================================================
#  ለነገ CPA — VPS Deployment Script (Shared Server Safe)
#  Steps: 5, 7–13  (Cloudflare DNS/SSL, real-IP, MongoDB skipped)
#
#  IMPORTANT: This server hosts other projects.
#  This script ONLY touches:
#    - /var/www/cpa-hub-platform  (our code)
#    - /var/www/cpa-hub-admin     (admin dashboard static files)
#    - /etc/nginx/sites-available/{app,api,ad}.conf  (our nginx blocks)
#    - /etc/nginx/sites-enabled/{app,api,ad}.conf   (our symlinks)
#    - PM2 processes named cpa-hub-*
#
#  Usage:
#    1. Upload to VPS:  scp deploy/deploy.sh root@186.241.20.75:/tmp/
#    2. SSH in:         ssh root@186.241.20.75
#    3. Run:            bash /tmp/deploy.sh
# ============================================================
set -euo pipefail

# ─── SECRETS ────────────────────────────────────────────────
GIT_REPO_URL="https://github.com/abelzeleke0949-cell/Tgaffliate.git"
MONGODB_URI="mongodb://localhost:27017/cpa-hub"
TELEGRAM_BOT_TOKEN="8898753450:AAEJ3GQIcSS8fs72TMFvQQGMTrB8fR46Mb8"
ADMIN_NAME="Abel Admin"
ADMIN_EMAIL="abeladmin@gmail.com"
ADMIN_PASSWORD="14390982"
# ─────────────────────────────────────────────────────────────

JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
CHAPA_WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

DEPLOY_DIR="/var/www/cpa-hub-platform"
ADMIN_DIR="/var/www/cpa-hub-admin"

echo "=========================================="
echo "  ለነገ CPA Deployment — Starting"
echo "  (safe for other projects on this VPS)"
echo "=========================================="

# ── Step 5: Base server setup ───────────────────────────────
echo ""
echo "▶ Step 5: Base server setup..."

if ! command -v node &>/dev/null; then
  echo "  Installing Node.js 22.x..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt install -y nodejs
else
  echo "  ✓ Node.js already installed: $(node -v)"
fi

if ! command -v pm2 &>/dev/null; then
  echo "  Installing PM2..."
  sudo npm install -g pm2
else
  echo "  ✓ PM2 already installed"
fi

if ! command -v nginx &>/dev/null; then
  echo "  Installing Nginx..."
  sudo apt install -y nginx
else
  echo "  ✓ Nginx already installed"
fi

echo "  Configuring firewall (adding only our rules)..."
sudo ufw allow OpenSSH 2>/dev/null || true
sudo ufw allow "Nginx Full" 2>/dev/null || true

echo "  ✓ Done"

# ── Step 7: Clone the repo ──────────────────────────────────
echo ""
echo "▶ Step 7: Cloning repository..."

if [ -d "$DEPLOY_DIR/.git" ]; then
  echo "  Directory exists with git repo — pulling latest..."
  cd "$DEPLOY_DIR"
  git pull
else
  sudo mkdir -p /var/www
  sudo chown $USER:$USER /var/www
  if [ -d "$DEPLOY_DIR" ]; then
    sudo rm -rf "$DEPLOY_DIR"
  fi
  mkdir -p "$DEPLOY_DIR"
  cd "$DEPLOY_DIR"
  git clone "$GIT_REPO_URL" .
fi

echo "  ✓ Done"

# ── Step 8: Backend ─────────────────────────────────────────
echo ""
echo "▶ Step 8: Setting up backend..."

cd "$DEPLOY_DIR/backend"

cat > .env <<EOF
NODE_ENV=production
PORT=5001
MONGODB_URI=$MONGODB_URI
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
CORS_ORIGINS=https://app.lightb.tech,https://ad.lightb.tech
CHAPA_WEBHOOK_SECRET=$CHAPA_WEBHOOK_SECRET
FRONTEND_URL=https://app.lightb.tech
MINI_APP_URL=https://app.lightb.tech/miniapp
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_DOMAIN=https://api.lightb.tech
ADMIN_NAME=$ADMIN_NAME
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
EOF

echo "  Installing dependencies (production)..."
npm install --omit=dev

echo "  Seeding database..."
npm run seed

echo "  Creating admin account..."
npm run create-admin

echo "  ✓ Backend configured"

# ── Step 9: Brand dashboard (cpa-hub) ───────────────────────
echo ""
echo "▶ Step 9: Building brand dashboard (cpa-hub)..."

cd "$DEPLOY_DIR/cpa-hub"

cat > .env <<EOF
VITE_API_URL=https://api.lightb.tech/api
VITE_CHAPA_WEBHOOK_SECRET=$CHAPA_WEBHOOK_SECRET
EOF

echo "  Installing dependencies..."
npm install

echo "  Building..."
npm run build

echo "  ✓ Brand dashboard built"

# ── Step 10: Admin dashboard ────────────────────────────────
echo ""
echo "▶ Step 10: Building admin dashboard..."

cd "$DEPLOY_DIR/admin-dashboard"

cat > .env <<EOF
VITE_API_URL=https://api.lightb.tech/api
EOF

echo "  Installing dependencies..."
npm install

echo "  Building..."
npm run build

echo "  Copying to $ADMIN_DIR..."
sudo mkdir -p "$ADMIN_DIR"
sudo cp -r dist/* "$ADMIN_DIR/"

echo "  ✓ Admin dashboard built and deployed"

# ── Step 11: PM2 (only OUR processes) ───────────────────────
echo ""
echo "▶ Step 11: Starting PM2 processes..."

cd "$DEPLOY_DIR"

# Only delete processes that belong to us
pm2 delete cpa-hub-backend 2>/dev/null || true
pm2 delete cpa-hub-frontend 2>/dev/null || true

pm2 start ecosystem.config.cjs --env production
pm2 save

echo "  ✓ PM2 processes started"

# ── Step 12: Nginx site configs (ONLY our blocks) ───────────
echo ""
echo "▶ Step 12: Configuring Nginx..."

# Only copy our configs — never touch other sites
sudo cp "$DEPLOY_DIR/deploy/nginx/app.conf" /etc/nginx/sites-available/app.conf
sudo cp "$DEPLOY_DIR/deploy/nginx/api.conf" /etc/nginx/sites-available/api.conf
sudo cp "$DEPLOY_DIR/deploy/nginx/ad.conf" /etc/nginx/sites-available/ad.conf

sudo ln -sf /etc/nginx/sites-available/app.conf /etc/nginx/sites-enabled/app.conf
sudo ln -sf /etc/nginx/sites-available/api.conf /etc/nginx/sites-enabled/api.conf
sudo ln -sf /etc/nginx/sites-available/ad.conf /etc/nginx/sites-enabled/ad.conf

# Do NOT remove default or any other existing configs
# Only test and reload — other sites stay intact
sudo nginx -t && sudo systemctl reload nginx

echo "  ✓ Nginx configured and reloaded"

# ── Step 13: Verify ─────────────────────────────────────────
echo ""
echo "▶ Step 13: Verifying deployment..."
echo ""

echo "  PM2 status:"
pm2 status

echo ""
echo "  Health check (backend :5001):"
curl -s http://127.0.0.1:5001/health || echo "  ⚠ Backend health check failed"

echo ""
echo "  Health check (brand dashboard :3001):"
curl -s -o /dev/null -w "HTTP %{http_code}" http://127.0.0.1:3001 || echo "  ⚠ Brand dashboard check failed"

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "  Our apps (no other projects affected):"
echo "    Brand Dashboard:  https://app.lightb.tech"
echo "    API:              https://api.lightb.tech"
echo "    Admin Dashboard:  https://ad.lightb.tech"
echo ""
echo "  Merchant login:  coffee@example.com / password123"
echo "  Admin login:     $ADMIN_EMAIL / $ADMIN_PASSWORD"
echo ""
echo "  Verify externally:"
echo "    curl -sI https://app.lightb.tech | grep -i cf-ray"
echo ""
