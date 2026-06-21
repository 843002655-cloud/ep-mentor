#!/bin/bash
# EP Mentor — 从 GitHub 拉取并部署（推荐，替代 scp 整包）
# 用法: bash scripts/deploy-git.sh [branch]
# 在服务器上: cd /home/admin/ep-mentor && bash scripts/deploy-git.sh master
set -euo pipefail

APP_DIR="${APP_DIR:-/home/admin/ep-mentor}"
BRANCH="${1:-master}"

cd "$APP_DIR"

if [ ! -d .git ]; then
  echo "错误: $APP_DIR 不是 git 仓库"
  echo "首次初始化: git clone https://github.com/843002655-cloud/ep-mentor.git $APP_DIR"
  exit 1
fi

echo "==> 备份 .env.local"
cp "$APP_DIR/.env.local" /tmp/ep-mentor.env.local.bak

echo "==> git fetch + checkout $BRANCH"
git fetch origin
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "==> 恢复 .env.local"
cp /tmp/ep-mentor.env.local.bak "$APP_DIR/.env.local"

echo "==> 清理旧构建"
rm -rf "$APP_DIR/.next"

cd "$APP_DIR"
echo "==> npm install"
npm install --prefer-offline 2>&1 | tail -5

echo "==> npm run build"
npm run build 2>&1 | tail -15

echo "==> pm2 restart ep-mentor"
pm2 restart ep-mentor
pm2 save

sleep 4
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:3000/ || true
pm2 list
