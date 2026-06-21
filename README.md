# EP Mentor — 心脏电生理AI导师

⚡ 面向心脏电生理医生的AI教学平台。

## 功能

- 📚 **病例库** — 分类浏览 SVT / VT / AF / 预激综合征经典电生理案例
- 🤖 **AI 导师对话** — 苏格拉底式教学，DeepSeek AI 驱动
- 📝 **知识测验** — 选择题形式巩固知识点（题库后台可管理）
- 📖 **学习资料库** — 临床指南、学术文献、教学视频分类浏览
- 📤 **医生投稿** — 提交真实脱敏病例
- ⚙️ **管理后台** — 案例 CRUD | 投稿审核 | AI 生成案例 | 资料管理 | 题库管理

## 技术栈

- **框架：** Next.js 14 (App Router) + TypeScript
- **样式：** Tailwind CSS（深色医疗科技风）
- **数据库：** Supabase (PostgreSQL + Auth + RLS)
- **AI：** DeepSeek Chat API（OpenAI 兼容接口）
- **部署：** 支持 Vercel / 阿里云 / 任意 Node.js 服务器

## 快速开始

### 1. 安装依赖

```bash
cd ep-mentor
npm install
```

### 2. 配置环境变量

复制 `.env.local.example` 为 `.env.local` 并填入真实值：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# DeepSeek AI
DEEPSEEK_API_KEY=sk-your_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# DashScope 视觉（AI 顾问图片，可选）
DASHSCOPE_API_KEY=
DASHSCOPE_VL_MODEL=qwen-vl-max

# 站点
NEXT_PUBLIC_SITE_URL=https://www.yovigo.cn

# 管理员
ADMIN_EMAIL=your_email@qq.com
NEXT_PUBLIC_ADMIN_EMAIL=your_email@qq.com

# 微信 / 支付（可选，见 .env.local.example）
```

完整变量列表见 `.env.local.example`。

### 3. 创建数据库

在 Supabase SQL Editor 中执行 `supabase-schema.sql`（一次性创建所有表+种子数据）。

### 4. 启动

```bash
npm run dev
```

### 5. 测试与检查

```bash
npm run lint
npm test
npm run build
```

## 日常维护流程

```
每天 10 分钟：

1. /admin/generate → AI 生成新病例 → 编辑 → 发布
2. /admin/submissions → 审核医生投稿
3. /admin/resources → 添加新的指南/文献/视频
4. /admin/quiz → 添加新的测验题目
5. /admin/cases → 下架过时病例，编辑更新内容
```

## 多电脑协作（Git + GitHub）

代码源：**https://github.com/843002655-cloud/ep-mentor**

### 新电脑首次 setup

```bash
git clone https://github.com/843002655-cloud/ep-mentor.git
cd ep-mentor
npm install
cp .env.local.example .env.local   # 填入密钥（与 Supabase 控制台一致）
npm run dev
```

### 日常：换电脑前

```bash
git add .
git commit -m "描述本次改动"
git push origin master
```

### 日常：换电脑后

```bash
git pull origin master
npm install    # package.json 有变化时
npm run dev
```

`.env.local` **不要提交 Git**，用 U 盘 / 密码管理器 / 加密笔记在电脑间同步。完整变量说明与勾选表见 **[docs/env-local-sync-checklist.md](docs/env-local-sync-checklist.md)**。

### 功能分支（可选）

```bash
git checkout -b feature/my-change
# ... 改完 ...
git push -u origin feature/my-change
# GitHub 上开 PR 合并到 master
```

## 部署

### 推荐：服务器 git pull（与 GitHub 同步）

服务器目录 `/home/admin/ep-mentor` 已是 git 仓库，推送后在服务器执行：

```bash
cd /home/admin/ep-mentor
bash scripts/deploy-git.sh master
```

或从本机 SSH 一键部署：

```bash
ssh admin@YOUR_SERVER "cd /home/admin/ep-mentor && bash scripts/deploy-git.sh master"
```

### 备选：scp 整包（离线 / 大文件未进 Git 时）

```bash
tar --exclude=node_modules --exclude=.next --exclude=.git \
  --exclude=batch-output --exclude=batch-output-v3 --exclude=0607 \
  --exclude=scripts/extracted_figures --exclude=*.tar.gz \
  -czf ep-mentor-deploy.tar.gz .
scp ep-mentor-deploy.tar.gz admin@YOUR_SERVER:/tmp/ep-mentor-deploy.tar.gz
ssh admin@YOUR_SERVER "bash /home/admin/ep-mentor/scripts/deploy-remote.sh"
```

- **Vercel:** `git push` 可触发自动部署
- **阿里云 ECS:** PM2 + Nginx，端口 **3000**，域名 www.yovigo.cn

## 提醒

- 仅供医学教育使用，不构成临床决策建议
- AI 生成的病例需经人工审核确认医学准确性
