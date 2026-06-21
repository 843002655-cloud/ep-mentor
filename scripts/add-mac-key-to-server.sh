#!/bin/bash
# 在「已能 SSH 登录服务器」的电脑上运行此脚本，将本 Mac 的公钥加入服务器。
# 用法: bash scripts/add-mac-key-to-server.sh
#
# 本机 Mac 公钥指纹应为:
#   SHA256:DUnNsGGOw3irFvGxedAOLrOX64W6toYMrwzK/sWu/Rk
set -euo pipefail

SERVER="${SERVER:-admin@47.84.49.31}"
PUBKEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGzaiqcvMQFwYdZ2twMP3WRYRcwbIPnIY1/ztyqohngQ 843002655@qq.com"

echo "==> 将 MacBook 公钥添加到 $SERVER"
ssh "$SERVER" "mkdir -p ~/.ssh && chmod 700 ~/.ssh && grep -qxF '$PUBKEY' ~/.ssh/authorized_keys 2>/dev/null || echo '$PUBKEY' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo '公钥已添加'"

echo ""
echo "==> 验证：在本 Mac 上运行"
echo "    ssh yovigo \"echo 连接成功 && hostname\""
