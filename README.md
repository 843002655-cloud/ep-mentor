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

# 管理员
ADMIN_EMAIL=your_email@qq.com
NEXT_PUBLIC_ADMIN_EMAIL=your_email@qq.com
```

### 3. 创建数据库

在 Supabase SQL Editor 中执行 `supabase-schema.sql`（一次性创建所有表+种子数据）。

### 4. 启动

```bash
npm run dev
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

## 部署

支持任何可以运行 Node.js 的服务器：

- **Vercel:** `git push` 自动部署
- **阿里云 + 宝塔:** PM2 守护 + Nginx 反向代理
- **Docker:** `docker build -t ep-mentor .`

## 提醒

- 仅供医学教育使用，不构成临床决策建议
- AI 生成的病例需经人工审核确认医学准确性
