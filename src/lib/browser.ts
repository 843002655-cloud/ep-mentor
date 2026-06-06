/**
 * 浏览器 API 统一封装 — 为 SSR 安全和小程序移植准备
 *
 * 原则：
 * 1. 所有 window/document API 调用必须经过此文件
 * 2. SSR 时（typeof window === "undefined"）安全降级，不抛错
 * 3. 移植小程序时，只需修改此文件，把对应函数映射到 wx.xxx API
 */

// ── 环境判断 ────────────────────────────────────────────────────

/** 当前是否在浏览器环境（SSR 安全） */
export const isBrowser = (): boolean =>
  typeof window !== "undefined" && typeof document !== "undefined";

// ── 页面导航 ────────────────────────────────────────────────────

/** 页面跳转（硬刷新，用于登录/登出后 cookie 同步） */
export const navigateTo = (url: string): void => {
  if (isBrowser()) {
    window.location.href = url;
  }
};

/** 页面替换（不记录历史，用于登录后跳转） */
export const replaceTo = (url: string): void => {
  if (isBrowser()) {
    window.location.replace(url);
  }
};

/** 小程序移植时，将上面两个函数替换为：
 *  navigateTo  → wx.navigateTo({ url })
 *  replaceTo   → wx.redirectTo({ url })
 */

// ── DOM 事件 ────────────────────────────────────────────────────

/** 在 document 上注册事件（SSR 安全） */
export const onDocumentEvent = (
  event: string,
  handler: (e: Event) => void
): (() => void) => {
  if (!isBrowser()) return () => {};
  document.addEventListener(event, handler);
  return () => document.removeEventListener(event, handler);
};

/** 小程序移植时 → 无需替代（小程序无 document 全局事件，用 catchtouchmove 等替代） */

// ── URL 操作 ────────────────────────────────────────────────────

/** 获取当前完整 URL（SSR 安全） */
export const getCurrentUrl = (): string => {
  if (!isBrowser()) return "";
  return window.location.href;
};

/** 获取 URL 参数 */
export const getUrlParam = (name: string): string | null => {
  if (!isBrowser()) return null;
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
};

// ── 视口/滚动 ────────────────────────────────────────────────────

/** 滚动到顶部 */
export const scrollToTop = (): void => {
  if (!isBrowser()) return;
  window.scrollTo({ top: 0, behavior: "smooth" });
};

/** 小程序移植时 → wx.pageScrollTo({ scrollTop: 0, duration: 300 }) */
