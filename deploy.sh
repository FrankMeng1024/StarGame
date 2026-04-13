#!/usr/bin/env bash
# deploy.sh — 追星少女 (StarCatcher) 部署脚本
# 纯静态前端，nginx 托管，HTTP only
#
# 用法：
#   chmod +x deploy.sh
#   DOMAIN=yiiling.cn ./deploy.sh          # http://yiiling.cn/Star
#   DOMAIN=yiiling.cn SUBPATH=/Star ./deploy.sh
#
# 安全：自动检测现有 nginx server block，合并 /Star location，不破坏其他配置

set -euo pipefail

DOMAIN="${DOMAIN:-localhost}"
SUBPATH="${SUBPATH:-/Star}"
DEPLOY_DIR="/var/www/starcatcher"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "[deploy] 目标: http://$DOMAIN$SUBPATH → $DEPLOY_DIR"

# ── 1. 确认 nginx 已安装 ────────────────────────────────────────
if ! command -v nginx &>/dev/null; then
  echo "[deploy] 安装 nginx..."
  apt-get update -qq && apt-get install -y nginx
fi

# ── 2. 同步文件 ─────────────────────────────────────────────────
echo "[deploy] 同步文件..."
mkdir -p "$DEPLOY_DIR"
rsync -a --delete \
  --exclude='.git' --exclude='*.ps1' --exclude='*.sh' \
  --exclude='docs/' --exclude='tasks/' --exclude='scripts/' \
  --exclude='*.png' --exclude='node_modules/' \
  "$REPO_DIR/" "$DEPLOY_DIR/"

# ── 3. 找到现有的 server block（处理 yiiling.cn）──────────────
echo "[deploy] 扫描现有 nginx 配置..."

# 找出包含 server_name yiiling.cn 的配置文件
EXISTING_CONF=""
for f in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf 2>/dev/null; do
  [ -f "$f" ] || continue
  if grep -q "server_name.*$DOMAIN" "$f" 2>/dev/null; then
    EXISTING_CONF="$f"
    echo "[deploy] 发现现有配置: $EXISTING_CONF"
    break
  fi
done

# ── 4. 构造要插入的 location 块 ─────────────────────────────────
NEW_LOCATION=$(cat <<LOCBLOCK

    # ── 追星少女 StarCatcher ──────────────────────────────
    location $SUBPATH/ {
        alias $DEPLOY_DIR/;
        index index.html;
        try_files \$uri \$uri/ ${SUBPATH}/index.html;
    }
    location $SUBPATH {
        return 301 \$scheme://\$host${SUBPATH}/;
    }
    location ~* ^${SUBPATH}/.+\.(js|css|svg|png|jpg|ico|woff2|webp)\$ {
        alias $DEPLOY_DIR/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    # ── /追星少女 ─────────────────────────────────────────
LOCBLOCK
)

# ── 5. 合并或新建配置 ───────────────────────────────────────────
if [ -n "$EXISTING_CONF" ]; then
  # 解析实际文件路径（sites-enabled 可能是软链接）
  REAL_CONF="$(readlink -f "$EXISTING_CONF")"
  echo "[deploy] 合并到现有配置: $REAL_CONF"

  # 备份
  cp "$REAL_CONF" "${REAL_CONF}.bak.$(date +%Y%m%d%H%M%S)"
  echo "[deploy] 已备份原配置"

  # 检查是否已包含我们的 location（避免重复插入）
  if grep -q "追星少女 StarCatcher" "$REAL_CONF"; then
    echo "[deploy] location 已存在，跳过插入"
  else
    # 在第一个 server block 的最后一个 } 之前插入
    # 用 awk：找到最后一个单独的 } 行，在它前面插入
    TMP_CONF=$(mktemp)
    awk -v block="$NEW_LOCATION" '
      /^\}/ { last_brace_line = NR; last_brace_pos = NR }
      { lines[NR] = $0 }
      END {
        for (i = 1; i <= NR; i++) {
          if (i == last_brace_pos) {
            print block
          }
          print lines[i]
        }
      }
    ' "$REAL_CONF" > "$TMP_CONF"
    mv "$TMP_CONF" "$REAL_CONF"
    echo "[deploy] location 已插入"
  fi

else
  # 没有找到现有配置，新建一个
  echo "[deploy] 未找到现有 $DOMAIN 配置，新建..."
  NEW_CONF="/etc/nginx/sites-available/starcatcher"
  cat > "$NEW_CONF" <<NGINX
server {
    listen 80;
    server_name $DOMAIN;
$NEW_LOCATION
}
NGINX
  ln -sf "$NEW_CONF" /etc/nginx/sites-enabled/starcatcher
  echo "[deploy] 新建配置: $NEW_CONF"
fi

# ── 6. 测试 + 重启 nginx ────────────────────────────────────────
echo "[deploy] 测试 nginx 配置..."
nginx -t

echo "[deploy] 重载 nginx..."
systemctl reload nginx

# ── 7. 健康检查 ─────────────────────────────────────────────────
sleep 1
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN$SUBPATH/")
echo "[deploy] HTTP $STATUS — http://$DOMAIN$SUBPATH/"
[ "$STATUS" = "200" ] && echo "[deploy] ✓ 部署成功" || echo "[deploy] ✗ 检查失败，请确认 DNS 已指向本机"
