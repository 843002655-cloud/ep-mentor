#!/bin/bash
# EP Mentor — 服务器部署脚本（与 ecg-academy 同机，端口 3000）
set -euo pipefail

APP_DIR="/home/admin/ep-mentor"
ARCHIVE="/tmp/ep-mentor-deploy.tar.gz"

if [ ! -f "$ARCHIVE" ]; then
  echo "错误: 未找到 $ARCHIVE"
  exit 1
fi

echo "==> 备份 .env.local"
cp "$APP_DIR/.env.local" /tmp/ep-mentor.env.local.bak

echo "==> 清理旧构建"
rm -rf "$APP_DIR/.next"

echo "==> 解压"
tar xzf "$ARCHIVE" -C "$APP_DIR"
rm -f "$ARCHIVE"

echo "==> 恢复 .env.local"
cp /tmp/ep-mentor.env.local.bak "$APP_DIR/.env.local"

cd "$APP_DIR"
npm install --prefer-offline 2>&1 | tail -5
npm run build 2>&1 | tail -15

echo "==> pm2 restart ep-mentor"
pm2 restart ep-mentor
pm2 save

sleep 5
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:3000/ || true
pm2 list
