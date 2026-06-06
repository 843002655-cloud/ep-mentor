/**
 * 统一图片/静态资源管理 — 为小程序移植准备
 *
 * 当前项目全部使用 Unicode Emoji 作为图标，无需本地图片文件。
 * 未来如需添加本地图片，按以下流程：
 *
 * 1. 上传图片到 Supabase Storage（bucket: assets）
 * 2. 获取公开 URL：https://<project>.supabase.co/storage/v1/object/public/assets/<filename>
 * 3. 在此文件注册常量
 * 4. 代码中引用 ASSETS.XXX
 *
 * 移植小程序时：
 *   - 将图片下载到 /assets/ 目录
 *   - 改此处常量为本地路径或 CDN
 */

// 未来启用时取消注释：
// const CDN = process.env.NEXT_PUBLIC_CDN_URL || "";

export const ASSETS = {
  // Logo — 当前用 Emoji ⚡ 替代
  // LOGO: CDN + "/logo.png",

  // 占位图 — 病例无图时使用
  // CASE_PLACEHOLDER: CDN + "/case-placeholder.png",
} as const;

/** 当前项目所有图标均使用 Unicode Emoji，无需迁移 */
export const ICONS = {
  LOGO: "⚡",
  CASES: "📚",
  AI: "🤖",
  QUIZ: "📝",
  SUBMIT: "📤",
  DASHBOARD: "📊",
  ADMIN: "⚙️",
  REGISTER: "🎓",
  LOGOUT: "🚪",
  TIME: "⏱",
  LEARNERS: "👥",
  CHECK: "✅",
  ECG: "⚡",
} as const;
