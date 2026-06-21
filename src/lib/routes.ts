/**
 * 统一路由常量 — 避免硬编码路径，移植小程序时只需改此文件。
 *
 * 小程序 tabBar 建议（4个底部导航）：
 *   /cases     → 病例库
 *   /quiz      → 知识测验
 *   /library   → 资料库
 *   /profile   → 我的（合并 dashboard + submit + admin 入口）
 *
 * 子页面（从 tabBar 进入，push 到页面栈）：
 *   /cases/[id]  → 病例详情 + AI 对话
 *   /auth        → 登录/注册
 *   /submit      → 投稿
 *   /admin/*     → 管理后台（仅管理员可见）
 */

export const ROUTES = {
  // ── 主页面 ──
  HOME: "/",
  CASES: "/cases",
  QUIZ: "/quiz",
  LIBRARY: "/library",
  AUTH: "/auth",
  DASHBOARD: "/dashboard",
  PROFILE: "/profile",
  SUBMIT: "/submit",
  ABOUT: "/about",
  UPGRADE: "/upgrade",
  TERMS: "/terms",
  TOOLS: "/tools",
  AI_CONSULT: "/ai-consult",

  // ── 子页面（带参数用工厂函数） ──
  CASE_DETAIL: (id: string) => `/cases/${id}`,
  AUTH_REGISTER: "/auth?register=1",
  AUTH_REDIRECT: (redirect: string) => `/auth?redirect=${encodeURIComponent(redirect)}`,
  CASES_CATEGORY: (category: string) => `/cases?category=${category}`,

  // ── 管理后台 ──
  ADMIN_PREFIX: "/admin",
  ADMIN: "/admin",
  ADMIN_CASES: "/admin/cases",
  ADMIN_CREATE_CASE: "/admin/create-case",
  ADMIN_SUBMISSIONS: "/admin/submissions",
  ADMIN_GENERATE: "/admin/generate",
  ADMIN_RESOURCES: "/admin/resources",
  ADMIN_QUIZ: "/admin/quiz",
  ADMIN_MEMBERSHIP: "/admin/membership",

  // ── API ──
  API_CASES: "/api/cases",
  API_CASE: (id: string) => `/api/cases/${id}`,
  API_CHAT: "/api/chat",
  API_GENERATE_CASE: "/api/generate-case",
  API_PROGRESS: "/api/progress",
  API_PROGRESS_COMPLETE: "/api/progress/complete",
  API_QUIZ_QUESTIONS: "/api/quiz-questions",
  API_QUIZ_QUESTION: (id: string) => `/api/quiz-questions/${id}`,
  API_RESOURCES: "/api/resources",
  API_RESOURCE: (id: string) => `/api/resources/${id}`,
  API_SUBMISSIONS: "/api/submissions",
  API_SUBMISSION: (id: string) => `/api/submissions/${id}`,
  API_ANALYTICS: "/api/analytics",
  API_WECHAT_LOGIN: "/api/wechat/login",
  API_MEMBERSHIP_ACTIVATE: "/api/membership/activate",
  API_ADMIN_ANALYTICS: "/api/admin/analytics",
  API_PAYMENT_WECHAT_NOTIFY: "/api/payment/wechat/notify",
} as const;
