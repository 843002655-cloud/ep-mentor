#!/bin/bash
# 从本 Mac 一键部署到生产服务器（需先完成 scripts/add-mac-key-to-server.sh）
# 用法: bash scripts/deploy-production.sh [branch]
set -euo pipefail

BRANCH="${1:-master}"

echo "==> 测试 SSH 连接..."
if ! ssh -o BatchMode=yes -o ConnectTimeout=10 yovigo "echo ok" >/dev/null 2>&1; then
  echo "错误: 无法 SSH 到 yovigo (47.84.49.31)"
  echo ""
  echo "请先在「能登录服务器的旧电脑」上运行："
  echo "  bash scripts/add-mac-key-to-server.sh"
  echo ""
  echo "或手动执行："
  echo "  ssh admin@47.84.49.31"
  echo "  echo '$(cat ~/.ssh/id_ed25519.pub 2>/dev/null || echo "<本机公钥>")' >> ~/.ssh/authorized_keys"
  exit 1
fi

echo "==> 部署 branch: $BRANCH"
ssh yovigo "cd /home/admin/ep-mentor && bash scripts/deploy-git.sh $BRANCH"

echo ""
echo "==> 完成。请访问 https://www.yovigo.cn 验证。"
