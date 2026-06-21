# 多电脑开发环境配置清单

> 代码仓库：https://github.com/843002655-cloud/ep-mentor  
> 数据库：Supabase 云端（所有电脑共用，无需本地建库）

---

## 一、新电脑首次 setup

```bash
git clone https://github.com/843002655-cloud/ep-mentor.git
cd ep-mentor
npm install
cp .env.local.example .env.local   # 填入真实密钥（见下方清单）
npm run dev
```

---

## 二、`.env.local` 配置清单

从**已配置好的电脑**复制 `.env.local`，或按下列说明逐项填写。

| 变量 | 必填 | 获取位置 |
|------|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | [Supabase 控制台](https://supabase.com/dashboard) → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | 同上 → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | 同上 → service_role key（**保密，仅服务端**） |
| `DEEPSEEK_API_KEY` | ✅ | [DeepSeek 开放平台](https://platform.deepseek.com/) → API Keys |
| `DEEPSEEK_BASE_URL` | ✅ | 默认 `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | ✅ | 默认 `deepseek-chat` |
| `NEXT_PUBLIC_SITE_URL` | ✅ | 生产：`https://www.yovigo.cn`；本地开发可改为 `http://localhost:3000` |
| `ADMIN_EMAIL` | ✅ | 管理员登录邮箱 |
| `NEXT_PUBLIC_ADMIN_EMAIL` | ✅ | 与 `ADMIN_EMAIL` 保持一致 |
| `DASHSCOPE_API_KEY` | 可选 | 阿里云 DashScope（AI 顾问图片分析） |
| `DASHSCOPE_VL_MODEL` | 可选 | 默认 `qwen-vl-max` |
| `WECHAT_*` | 可选 | 微信小程序登录 |
| `WECHAT_PAY_*` | 可选 | 微信支付 |

**同步方式（任选其一）：**
- 密码管理器（1Password / Bitwarden 等）保存 `.env.local` 内容
- 加密 U 盘 / 私有云笔记
- 从旧电脑直接复制文件：`scp user@旧电脑:/path/to/ep-mentor/.env.local .`

⚠️ **切勿**将 `.env.local` 提交到 Git（已在 `.gitignore` 中排除）。

---

## 三、Git 身份与 GitHub 推送

### 1. 设置提交者信息（每台电脑各设置一次）

```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱@example.com"
```

### 2. GitHub 认证（二选一）

**方式 A：HTTPS + Personal Access Token（推荐新手）**

1. GitHub → Settings → Developer settings → Personal access tokens
2. 生成 token，勾选 `repo` 权限
3. 首次 `git push` 时，用户名填 GitHub 用户名，密码填 token

macOS 可缓存凭证：

```bash
git config --global credential.helper osxkeychain
```

**方式 B：SSH 密钥**

```bash
ssh-keygen -t ed25519 -C "你的邮箱@example.com"
cat ~/.ssh/id_ed25519.pub   # 复制到 GitHub → Settings → SSH keys
git remote set-url origin git@github.com:843002655-cloud/ep-mentor.git
```

### 3. 验证推送权限

```bash
git push --dry-run origin master
```

无报错即表示配置成功。

---

## 四、日常协作流程

**离开电脑前（有改动）：**

```bash
git add .
git commit -m "描述本次改动"
git push origin master
```

**换电脑后：**

```bash
git pull origin master
npm install    # 仅当 package.json 变化时
npm run dev
```

---

## 五、验证环境是否正常

```bash
npm run lint      # 代码检查
npm test          # 单元测试
npm run build     # 生产构建（需 .env.local 填好密钥）
npm run dev       # 本地开发 http://localhost:3000
```

---

## 六、不需要同步的内容

| 目录/文件 | 说明 |
|-----------|------|
| `node_modules/` | 每台电脑 `npm install` 生成 |
| `.next/` | 构建缓存，自动生成 |
| `.env.local` | 含密钥，手动同步 |
| `batch-output/`、`0607/` 等 | 本地大文件，已在 `.gitignore` |
