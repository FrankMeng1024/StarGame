#!/usr/bin/env bash
# deploy.sh — 追星少女 (StarCatcher) 部署脚本
# 纯静态前端，nginx 托管，HTTP only
#
# 用法：
#   chmod +x deploy.sh
#   DOMAIN=yiiling.cn ./deploy.sh          # http://yiiling.cn/Star
#   DOMAIN=yiiling.cn SUBPATH=/Star ./deploy.sh

set -euo pipefail

DOMAIN="${DOMAIN:-localhost}"
SUBPATH="${SUBPATH:-/Star}"
DEPLOY_DIR="/var/www/starcatcher"
NGINX_CONF="/etc/nginx/sites-available/starcatcher"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "[deploy] $DOMAIN$SUBPATH → $DEPLOY_DIR"

# 1. 安装 nginx（如果没有）
if ! command -v nginx &>/dev/null; then
  apt-get update -qq && apt-get install -y nginx
fi

# 2. 同步文件
mkdir -p "$DEPLOY_DIR"
rsync -a --delete \
  --exclude='.git' --exclude='*.ps1' --exclude='*.sh' \
  --exclude='docs/' --exclude='tasks/' --exclude='scripts/' \
  --exclude='*.png' --exclude='node_modules/' \
  "$REPO_DIR/" "$DEPLOY_DIR/"

# 3. 写 nginx 配置
cat > "$NGINX_CONF" <<NGINX
server {
    listen 80;
    server_name $DOMAIN;

    location $SUBPATH {
        alias $DEPLOY_DIR/;
        index index.html;
        try_files \$uri \$uri/ ${SUBPATH}/index.html;
    }

    location ~* ^${SUBPATH}/.+\.(js|css|svg|png|jpg|ico|woff2)\$ {
        alias $DEPLOY_DIR/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/starcatcher
nginx -t && systemctl reload nginx

# 4. 健康检查
sleep 1
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN$SUBPATH/")
echo "[deploy] HTTP $STATUS — http://$DOMAIN$SUBPATH/"
[ "$STATUS" = "200" ] && echo "[deploy] ✓ 部署成功" || echo "[deploy] ✗ 检查失败，请确认 DNS 已指向本机"
