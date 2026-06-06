# EP Mentor — PC 网页迁移微信小程序检查清单

## 一、技术栈现状

| 项目 | PC 网页 | 小程序目标 |
|------|---------|-----------|
| 框架 | Next.js 14 + React + TypeScript | Taro / uni-app |
| 样式 | Tailwind CSS | Tailwind (weapp-tailwindcss) 或 uni-app 原生 |
| 数据库 | Supabase PostgreSQL | 复用同一后端 |
| AI | DeepSeek API (服务端中转) | 复用同一 API |
| 组件 | React 函数组件 | 小程序原生组件或 Taro 组件 |
| 状态 | React useState/useEffect | 小程序 data/setData 或 Taro hooks |

## 二、已完成的迁移准备工作

### ✅ Service 层（9 个 service）
| Service | 文件 | 移植时改动 |
|------|------|-----------|
| `caseService` | `lib/services/caseService.ts` | 无需改动（`fetch` → `wx.request` 在 storage 层处理） |
| `authService` | `lib/services/authService.ts` | 添加 `wechat` 分支实现 |
| `chatService` | `lib/services/chatService.ts` | `sendMessageStream` → 仅用 `sendMessage`（非流式） |
| `progressService` | `lib/services/progressService.ts` | 无需改动 |
| `quizService` | `lib/services/quizService.ts` | 无需改动 |
| `resourceService` | `lib/services/resourceService.ts` | 无需改动 |
| `submissionService` | `lib/services/submissionService.ts` | 无需改动 |
| `wechatAuthService` | `lib/services/wechatAuthService.ts` | 取消注释 + 实现 `wx.login` |
| `storage.ts` | `lib/storage.ts` | `localStorage` → `wx.setStorageSync` |

### ✅ 平台抽象层（3 个工具模块）
| 模块 | 文件 | 移植时改动 |
|------|------|-----------|
| `storage.ts` | 浏览器 localStorage | → `wx.setStorageSync` / `getStorageSync` |
| `browser.ts` | `window.location` / `document` | → `wx.navigateTo` / `wx.redirectTo` |
| `routes.ts` | 40 个路由常量 | → 小程序路径映射配置 |

### ✅ 其他准备
- [x] 无本地图片（全部 Emoji 图标）
- [x] 无 `<Image>` / `<img>` 标签
- [x] API 请求全部走 service 层（除 admin 页面）
- [x] 非流式 `sendMessage` 已实现（小程序兼容）
- [x] 微信登录接口预留（`/api/wechat/login`）
- [x] 暗黑模式 CSS 变量已注入
- [x] 移动端适配（375px、44px 触摸、安全区域）

## 三、小程序项目建议架构

```
ep-mentor-mp/
├── miniprogram/
│   ├── app.json          # 页面路由 + 窗口配置
│   ├── app.ts            # 全局 App
│   ├── app.wxss          # 全局样式（Tailwind 编译产物）
│   ├── pages/
│   │   ├── index/        # 首页 (tab)
│   │   ├── cases/        # 病例库 (tab)
│   │   ├── study/        # 学习 (tab)
│   │   │   ├── quiz/     # 测验
│   │   │   ├── library/  # 资料库
│   │   │   └── tools/    # EP 工具
│   │   ├── profile/      # 我的 (tab)
│   │   │   ├── dashboard/
│   │   │   ├── submit/
│   │   │   └── settings/
│   │   ├── case-detail/  # 病例详情（二级页）
│   │   ├── auth/         # 登录（二级页）
│   │   └── upgrade/      # 升级会员（二级页）
│   ├── components/       # 可复用组件
│   │   ├── heart-model/  # 3D 心脏模型
│   │   ├── typewriter/   # 打字机动画
│   │   └── ...
│   └── utils/
│       ├── api.ts        # wx.request 封装
│       ├── storage.ts    # wx.storage 封装
│       └── routes.ts     # 路径常量
└── project.config.json
```

## 四、页面栈规划

### TabBar（4 个底部导航）
| 标签 | 路径 | 对应 PC 页面 |
|------|------|------------|
| 🏠 首页 | `pages/index/index` | `/` |
| 📋 病例 | `pages/cases/cases` | `/cases` |
| 📝 学习 | `pages/study/study` | `/quiz` + `/tools` |
| 👤 我的 | `pages/profile/profile` | `/profile` |

### 二级页面
| 页面 | 路径 | 进入方式 |
|------|------|---------|
| 病例详情 | `pages/case-detail/case-detail` | 从病例库 navigateTo |
| 登录 | `pages/auth/auth` | 从任意页 navigateTo |
| 资料库 | `pages/study/library` | 从学习 tab navigateTo |
| EP 工具 | `pages/study/tools` | 从学习 tab navigateTo |
| 投稿 | `pages/profile/submit` | 从我的 navigateTo |
| 升级会员 | `pages/upgrade/upgrade` | 从我的 navigateTo |

### 页面栈深度
最深路径：首页 → 病例库 → 病例详情 = 3 层 << 10 层小程序限制 ✅

## 五、移植实施步骤（按顺序）

### Step 1：项目初始化
- [ ] 用 `taro init` 或 HBuilderX 创建小程序项目
- [ ] 配置 `weapp-tailwindcss` 或使用 uni-app 样式方案
- [ ] 复制 `lib/services/` 目录
- [ ] 将 `fetch()` 替换为 `wx.request()` 封装

### Step 2：存储与路由
- [ ] 重写 `lib/storage.ts`：`localStorage` → `wx.setStorageSync`
- [ ] 重写 `lib/browser.ts`：`window.xxx` → `wx.xxx`
- [ ] 配置 `routes.ts`：路径映射到小程序页面

### Step 3：页面迁移
- [ ] 按 TabBar → 二级页 → 三级页顺序迁移
- [ ] Tailwind className 需转义（或使用 weapp-tailwindcss 插件）
- [ ] React hooks 切换为 Taro hooks 或小程序 Page 生命周期

### Step 4：微信登录
- [ ] 填写 `WECHAT_APP_ID` / `WECHAT_APP_SECRET` 环境变量
- [ ] 取消 `wechatAuthService.ts` 中的注释
- [ ] 实现 `/api/wechat/login` 后端（取消注释现有代码）
- [ ] 登录页增加微信一键登录按钮

### Step 5：测试与上线
- [ ] iOS + Android 真机测试
- [ ] 基础库 ≥ 2.25.0 兼容性检查
- [ ] 提交微信审核

## 六、已知差异与处理

| 差异 | PC 网页 | 小程序 | 处理方式 |
|------|---------|--------|---------|
| 流式 AI | SSE ReadableStream | ❌ 不支持 | 使用 `sendMessage`（非流式） |
| 3D 心脏模型 | SVG + CSS | ✅ 完全兼容 | 直接复用 |
| 暗黑模式 | CSS class="dark" | 需 darkmode 配置 | 在 app.json 配置 |
| 管理后台 | 完整 CRUD | 暂不迁移 | 保留 PC 端管理 |
| 图片 | Emoji | Emoji | 无影响 |
| 字体 | Google Fonts | ❌ 不支持外部 | 改用系统字体或下载嵌入 |
| EGM 播放器 | SVG Mock | SVG Mock | 直接复用 |
| localStorage | 原生 API | wx.storage | storage.ts 已抽象 |
| 路由 | Next.js App Router | 小程序页面栈 | routes.ts 已抽象 |

## 七、建议的推荐框架

**推荐 Taro 3.x**（React 语法编译为小程序）：
- 现有 React 组件可直接迁移
- Tailwind 通过 `weapp-tailwindcss` 插件支持
- 社区活跃，文档完善

备选：**uni-app**（Vue 语法，同样支持编译为小程序）
