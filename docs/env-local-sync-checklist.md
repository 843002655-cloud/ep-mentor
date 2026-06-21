# EP Mentor — `.env.local` 同步清单

`.env.local` **不进 Git**。换电脑、新同事 onboarding、或密钥轮换后，用本文逐项核对。

模板文件：项目根目录 [`.env.local.example`](../.env.local.example)

---

## 一、需要这份文件的环境

| 环境 | 路径 | 说明 |
|------|------|------|
| 本地开发机 A/B/C… | `ep-mentor/.env.local` | `npm run dev` / 脚本 |
| 生产服务器 | `/home/admin/ep-mentor/.env.local` | PM2 `ep-mentor`，端口 3000 |
| Vercel（若启用） | Project → Settings → Environment Variables | 与本地变量名一致 |

**与 ecg-academy 的关系：** 两站共用同一 Supabase 项目时，`NEXT_PUBLIC_SUPABASE_*` 与 `SUPABASE_SERVICE_ROLE_KEY` **必须相同**；`NEXT_PUBLIC_SITE_URL` 等各站独立。

---

## 二、变量清单（按优先级）

### 必填 — 没有则站点无法正常运行

| 变量 | 示例格式 | 用途 | 从哪里取 |
|------|----------|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | 前端 + 服务端连库 | [Supabase](https://supabase.com/dashboard) → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ…` 或 `sb_publishable_…` | 浏览器端 Supabase 客户端 | 同上（anon / publishable key） |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ…` 或 `sb_secret_…` | 服务端 admin、配额、部分 API | 同上（service_role / secret key，**绝不可暴露到前端**） |
| `DEEPSEEK_API_KEY` | `sk-…` | AI 导师对话、生成病例 | [DeepSeek 控制台](https://platform.deepseek.com/) |
| `ADMIN_EMAIL` | `843002655@qq.com` | 服务端判定管理员权限 | 你的管理员登录邮箱 |
| `NEXT_PUBLIC_ADMIN_EMAIL` | 与 `ADMIN_EMAIL` **相同** | 前端显示 / 跳转管理入口 | 同上 |

### 强烈建议 — 有默认值但生产应显式配置

| 变量 | 推荐值（EP Mentor） | 用途 |
|------|---------------------|------|
| `NEXT_PUBLIC_SITE_URL` | `https://www.yovigo.cn` | 邮件回调、OG、sitemap、robots |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | DeepSeek API 地址 |
| `DEEPSEEK_MODEL` | `deepseek-chat` | 对话 / 生成用的模型名 |

### 可选 — 按功能启用

| 变量 | 何时需要 | 说明 |
|------|----------|------|
| `DASHSCOPE_API_KEY` | 使用 **AI 顾问** 上传图片分析 | 阿里云 DashScope |
| `DASHSCOPE_VL_MODEL` | 同上 | 默认 `qwen-vl-max` |
| `WECHAT_APP_ID` | 微信小程序登录 | 微信公众平台 |
| `WECHAT_APP_SECRET` | 同上 | 同上 |
| `WECHAT_LOGIN_SECRET` | 同上（推荐单独随机串） | 未设时回退用 `SUPABASE_SERVICE_ROLE_KEY`（不推荐） |
| `WECHAT_PAY_API_V3_KEY` | 微信支付回调验签 | 微信商户平台 APIv3 密钥 |
| `WECHAT_PAY_NOTIFY_DEBUG` | 仅开发调试 | 生产务必 `false` 或不设置 |

### 维护脚本额外依赖

Python 脚本（如 `scripts/audit-case-products.py`）通过 [`scripts/supabase_env.py`](../scripts/supabase_env.py) 读取：

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

在项目根目录放置 `.env.local` 即可，无需单独配置。

---

## 三、跨环境必须一致的项

以下在所有机器 / 服务器上应 **字节级相同**（复制粘贴，勿手改）：

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `DEEPSEEK_API_KEY`（共用同一 DeepSeek 账户时）
- [ ] `ADMIN_EMAIL` 与 `NEXT_PUBLIC_ADMIN_EMAIL`（且两者相等）
- [ ] 微信相关密钥（若已启用小程序 / 支付）

## 四、可按环境不同的项

| 变量 | 本地 dev | 生产服务器 |
|------|----------|------------|
| `NEXT_PUBLIC_SITE_URL` | 可设 `http://localhost:3000` | `https://www.yovigo.cn` |
| `WECHAT_PAY_NOTIFY_DEBUG` | 可 `true`（调试） | 必须关闭 |

其余变量通常全环境相同。

---

## 五、推荐同步方式（按安全程度）

1. **密码管理器**（1Password / Bitwarden 等）— 建条目「EP Mentor .env.local」，各机器粘贴导出。
2. **加密压缩包** — `7z a -p env-backup.7z .env.local`，经微信 / 邮件传密语、文件分通道。
3. **U 盘** — 离线拷贝，用后删除 U 盘上的副本。
4. **服务器作只读参考**（已有 SSH 时）：
   ```bash
   scp admin@47.84.49.31:/home/admin/ep-mentor/.env.local ./.env.local
   ```
   下载后在本地核对，**不要**把含密钥的文件提交 Git。

❌ 不要：明文微信传、进 Git、进截图、进公开 Gist。

---

## 六、新电脑 Setup 勾选表

```bash
git clone https://github.com/843002655-cloud/ep-mentor.git
cd ep-mentor
cp .env.local.example .env.local
```

然后逐项打勾：

- [ ] 已从可信来源复制完整 `.env.local`
- [ ] `ADMIN_EMAIL` === `NEXT_PUBLIC_ADMIN_EMAIL`
- [ ] 无多余空格、无中文引号、每行 `KEY=value` 无引号或成对引号
- [ ] `npm install` 完成
- [ ] `npm run dev` 后首页可打开
- [ ] 登录管理员邮箱账号后可进 `/admin`
- [ ] 任选病例进入 AI 对话（验证 `DEEPSEEK_API_KEY`）
- [ ] （可选）AI 顾问发图（验证 `DASHSCOPE_API_KEY`）

---

## 七、更新服务器 `.env.local` 后

修改服务器 env **不会**随 `deploy-git.sh` 自动覆盖（脚本会备份并恢复 `.env.local`）。若你手动改了服务器配置：

```bash
ssh admin@47.84.49.31
cd /home/admin/ep-mentor
# 编辑 .env.local 后：
pm2 restart ep-mentor
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:3000/
```

勾选：

- [ ] `.env.local` 已保存
- [ ] `pm2 restart ep-mentor` 已执行
- [ ] 本地 `curl`/浏览器访问 https://www.yovigo.cn 正常
- [ ] 管理后台、AI 对话抽测通过

---

## 八、密钥轮换清单

轮换后需 **所有环境** 同步更新并重启：

| 事件 | 需更新的变量 | 动作 |
|------|--------------|------|
| Supabase 泄露 / 轮换 | `SUPABASE_SERVICE_ROLE_KEY`（及若轮换则 anon key） | 更新各机器 `.env.local` + 服务器 `pm2 restart` |
| DeepSeek 密钥重置 | `DEEPSEEK_API_KEY` | 同上 |
| 微信商户密钥变更 | `WECHAT_PAY_API_V3_KEY` | 同上 |
| 更换管理员邮箱 | `ADMIN_EMAIL` + `NEXT_PUBLIC_ADMIN_EMAIL` | 两处同时改；Supabase Auth 中该邮箱需存在 |

轮换后勾选：

- [ ] 本地 dev 已更新
- [ ] 服务器 `/home/admin/ep-mentor/.env.local` 已更新
- [ ] 密码管理器备份已更新
- [ ] 旧密钥已在对应平台作废

---

## 九、快速自检命令

**本地（PowerShell / bash）：**

```bash
# 检查必填项是否存在（不打印值）
grep -E '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|DEEPSEEK_API_KEY|ADMIN_EMAIL)=' .env.local
```

**服务器：**

```bash
ssh admin@47.84.49.31 "grep -c '^NEXT_PUBLIC_SUPABASE_URL=' /home/admin/ep-mentor/.env.local && pm2 show ep-mentor | head -5"
```

---

## 十、空白模板（复制后填值）

```env
# === 必填 ===
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
NEXT_PUBLIC_SITE_URL=https://www.yovigo.cn
ADMIN_EMAIL=
NEXT_PUBLIC_ADMIN_EMAIL=

# === 可选 ===
DASHSCOPE_API_KEY=
DASHSCOPE_VL_MODEL=qwen-vl-max
# WECHAT_APP_ID=
# WECHAT_APP_SECRET=
# WECHAT_LOGIN_SECRET=
# WECHAT_PAY_API_V3_KEY=
# WECHAT_PAY_NOTIFY_DEBUG=false
```

---

*最后更新：2026-06-21 · 与 `.env.local.example` 保持同步*
