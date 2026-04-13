#!/usr/bin/env bash
# deploy.sh — 追星少女 (StarCatcher) production deployment
# Pure static site: no build step, no backend, no Docker needed.
# Requires: nginx, git (or rsync if deploying from local machine)
#
# Usage (run on the server):
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Or pass a custom domain:
#   DOMAIN=starcatcher.yourdomain.com ./deploy.sh

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────
DOMAIN="${DOMAIN:-localhost}"
DEPLOY_DIR="/var/www/starcatcher"
NGINX_CONF="/etc/nginx/sites-available/starcatcher"
NGINX_ENABLED="/etc/nginx/sites-enabled/starcatcher"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"   # directory where this script lives

# ── 1. Install nginx if missing ───────────────────────────────────
if ! command -v nginx &>/dev/null; then
  echo "[deploy] Installing nginx..."
  apt-get update -qq && apt-get install -y nginx
fi

# ── 2. Copy static files ──────────────────────────────────────────
echo "[deploy] Copying files to $DEPLOY_DIR ..."
mkdir -p "$DEPLOY_DIR"
rsync -a --delete \
  --exclude='.git' \
  --exclude='*.ps1' \
  --exclude='*.sh' \
  --exclude='deploy.sh' \
  --exclude='docs/' \
  --exclude='tasks/' \
  --exclude='scripts/' \
  --exclude='*.png' \
  --exclude='node_modules/' \
  "$REPO_DIR/" "$DEPLOY_DIR/"
echo "[deploy] Files deployed to $DEPLOY_DIR"

# ── 3. Write nginx config ─────────────────────────────────────────
echo "[deploy] Writing nginx config for domain: $DOMAIN ..."
cat > "$NGINX_CONF" <<NGINX
server {
    listen 80;
    server_name $DOMAIN;

    root $DEPLOY_DIR;
    index index.html;

    # Serve all requests from index.html (single-page app)
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets aggressively (JS/CSS/SVG/images)
    location ~* \.(js|css|svg|png|jpg|jpeg|gif|ico|woff2|woff|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # No cache for index.html — always fresh
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Security headers
    add_header X-Content-Type-Options "nosniff";
    add_header X-Frame-Options "SAMEORIGIN";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/javascript image/svg+xml;
    gzip_min_length 1024;
}
NGINX

# ── 4. Enable site + reload nginx ────────────────────────────────
ln -sf "$NGINX_CONF" "$NGINX_ENABLED"
nginx -t
systemctl reload nginx
echo "[deploy] nginx reloaded."

# ── 5. Health check ───────────────────────────────────────────────
echo "[deploy] Health check..."
sleep 1
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN/")
if [ "$STATUS" = "200" ]; then
  echo "[deploy] ✓ PASS — http://$DOMAIN/ returned HTTP 200"
else
  echo "[deploy] ✗ FAIL — http://$DOMAIN/ returned HTTP $STATUS"
  exit 1
fi

echo ""
echo "[deploy] Deployment complete."
echo "  URL: http://$DOMAIN/"
echo ""
echo "  Optional next steps:"
echo "  - HTTPS: certbot --nginx -d $DOMAIN"
echo "  - Update: git pull && ./deploy.sh"
