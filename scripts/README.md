# EP Mentor 维护脚本索引

> 运行前请配置 `ep-mentor/.env.local`（含 `NEXT_PUBLIC_SUPABASE_URL` 与 `SUPABASE_SERVICE_ROLE_KEY`）。

## 部署（推荐）

| 脚本 | 用途 |
|------|------|
| `deploy-git.sh` | **推荐** — 服务器 `git pull` + build + pm2 restart |
| `deploy-remote.sh` | 备选 — 解压 `/tmp/ep-mentor-deploy.tar.gz` 后部署 |

```bash
# 服务器上（GitHub 已 push 后）
cd /home/admin/ep-mentor && bash scripts/deploy-git.sh master
```

| 脚本 | 用途 |
|------|------|
| `audit-case-products.py` | 统计 `content_json.product` 分布；`--fix` 为 legacy 病例补标 `ep-mentor` |
| `check-api.py` | 抽查线上 API 返回 |
| `audit-cases.py` | 病例字段完整性审计 |

## 数据修复（写库，运行前备份）

| 脚本 | 用途 |
|------|------|
| `enrich-figure-questions.py` | 批量 AI  enrichment 图表引导问题 |
| `restore-vol1-images.py` / `extract-vol2-images.py` | 恢复/提取 PDF 病例图片 |
| `fix-corrupted-vt-cases.py` | 修复损坏 VT 病例 JSON |

## 批量导入（管理员操作）

| 脚本 | 用途 |
|------|------|
| `batch-import-book.ts` | 从 JSON 批量导入病例书 |
| `batch-import-vol3.ts` | Vol3 VT 病例导入 |
| `deploy-remote.sh` | **服务器上**解压 tar 包并 pm2 restart |

## 部署

```bash
# 本地打包
tar --exclude=node_modules --exclude=.next --exclude=.git -czf ep-mentor-deploy.tar.gz .
scp ep-mentor-deploy.tar.gz admin@YOUR_SERVER:/tmp/ep-mentor-deploy.tar.gz
ssh admin@YOUR_SERVER "bash /home/admin/ep-mentor/scripts/deploy-remote.sh"
```

⚠️ 不要对生产库运行未审查的 `fix-*` / `restore-*` 脚本。先在本地或 staging 验证。
