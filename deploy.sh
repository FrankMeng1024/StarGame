#!/usr/bin/env bash
# deploy.sh — 追星少女 (StarCatcher) production deployment
# Pure static site: no build step, no backend, no Docker needed.
# Requires: nginx (installed automatically if missing on Debian/Ubuntu)
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh                                        # http://localhost/Star
#   DOMAIN=yiiling.cn ./deploy.sh                      # https://yiiling.cn/Star
#   DOMAIN=yiiling.cn SUBPATH=/Star ./deploy.sh        # explicit subpath
#   DOMAIN=yiiling.cn SUBPATH=/ ./deploy.sh            # root domain

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────
DOMAIN="${DOMAIN:-localhost}"
SUBPATH="${SUBPATH:-/Star}"          # URL subpath, e.g. /Star or /
DEPLOY_DIR="/var/www/starcatcher"
NGINX_CONF="/etc/nginx/sites-available/starcatcher"
NGINX_ENABLED="/etc/nginx/sites-enabled/starcatcher"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

# Normalise SUBPATH: ensure leading slash, strip trailing slash (unless root)
[[ "$SUBPATH" != /* ]] && SUBPATH="/$SUBPATH"
[[ "$SUBPATH" != "/" ]] && SUBPATH="${SUBPATH%/}"

echo "[deploy] Domain  : $DOMAIN"
echo "[deploy] Subpath : $SUBPATH"
echo "[deploy] Files   : $DEPLOY_DIR"

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
  --exclude='docs/' \
  --exclude='tasks/' \
  --exclude='scripts/' \
  --exclude='*.png' \
  --exclude='node_modules/' \
  "$REPO_DIR/" "$DEPLOY_DIR/"
echo "[deploy] Files synced."

# ── 3. Build nginx location block ────────────────────────────────
# Subpath deploy: location /Star { ... }
# Root deploy:    location / { ... }
if [ "$SUBPATH" = "/" ]; then
  LOCATION_BLOCK="location / {"
  FALLBACK="try_files \$uri \$uri/ /index.html;"
  INDEX_LOCATION="location = /index.html {"
  ASSET_REGEX="location ~* \\.(js|css|svg|png|jpg|jpeg|gif|ico|woff2|woff|ttf)\$ {"
else
  LOCATION_BLOCK="location $SUBPATH {"
  # Strip subpath prefix so files resolve against DEPLOY_DIR root
  FALLBACK="alias $DEPLOY_DIR/;
        try_files \$uri \$uri/ ${SUBPATH}/index.html;"
  INDEX_LOCATION="location = ${SUBPATH}/index.html {"
  ASSET_REGEX="location ~* ^${SUBPATH}/.+\\.(js|css|svg|png|jpg|jpeg|gif|ico|woff2|woff|ttf)\$ {"
fi

# ── 4. Write nginx config ─────────────────────────────────────────
echo "[deploy] Writing nginx config..."
cat > "$NGINX_CONF" <<NGINX
server {
    listen 80;
    server_name $DOMAIN;

    $([ "$SUBPATH" = "/" ] && echo "root $DEPLOY_DIR;" || echo "# Files served via alias inside location block")
    index index.html;

    # ── Game app ──────────────────────────────────────────────────
    $LOCATION_BLOCK
        $FALLBACK
    }

    # ── Cache static assets 1 year ────────────────────────────────
    $ASSET_REGEX
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # ── No-cache for index.html ───────────────────────────────────
    $INDEX_LOCATION
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # ── Security headers ──────────────────────────────────────────
    add_header X-Content-Type-Options "nosniff";
    add_header X-Frame-Options "SAMEORIGIN";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # ── Gzip ──────────────────────────────────────────────────────
    gzip on;
    gzip_types text/plain text/css application/javascript image/svg+xml;
    gzip_min_length 1024;
}
NGINX

# ── 5. Enable site + reload nginx ────────────────────────────────
ln -sf "$NGINX_CONF" "$NGINX_ENABLED"
nginx -t
systemctl reload nginx
echo "[deploy] nginx reloaded."

# ── 6. Health check ───────────────────────────────────────────────
HEALTH_URL="http://$DOMAIN${SUBPATH}/"
echo "[deploy] Health check: $HEALTH_URL"
sleep 1
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")
if [ "$STATUS" = "200" ]; then
  echo "[deploy] ✓ PASS — HTTP 200"
else
  echo "[deploy] ✗ FAIL — HTTP $STATUS (nginx may need HTTPS or DNS to resolve first)"
fi

echo ""
echo "[deploy] Deployment complete."
echo "  URL: http://$DOMAIN$SUBPATH/"
echo ""
echo "  Next steps for HTTPS:"
echo "  1. Point DNS A record for $DOMAIN to this server's IP"
echo "  2. apt-get install certbot python3-certbot-nginx"
echo "  3. certbot --nginx -d $DOMAIN"
echo "  4. Access at: https://$DOMAIN$SUBPATH/"
echo ""
echo "  To update later:"
echo "  git pull && ./deploy.sh"
