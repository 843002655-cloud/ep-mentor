// ── Auth Service ────────────────────────────────────────────────────────
// 统一登录入口，支持邮箱 / 微信 / 手机号三种方式。
// 移植小程序时只需实现 wechat / phone 分支，UI 组件零改动。

import { getSupabase } from "@/lib/supabase";
import storage from "@/lib/storage";
import { isBrowser } from "@/lib/browser";
import { getAdminEmail, getSupabaseAuthStorageKey } from "@/lib/admin-email";

// ── Types ──────────────────────────────────────────────────────────────

export type LoginMethod = "email" | "wechat" | "phone";

export interface LoginCredentials {
  /** 邮箱登录 */
  email?: string;
  password?: string;
  /** 微信登录（小程序 wx.login 返回的 code） */
  code?: string;
  /** 手机号登录 */
  phone?: string;
  verifyCode?: string;
}

// ── Internal helpers ───────────────────────────────────────────────────

async function emailLogin(email: string, password: string) {
  const { data, error } = await getSupabase().auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function wechatLogin(code: string) {
  const res = await fetch("/api/wechat/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "微信登录失败");
  const { data: session, error } = await getSupabase().auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
  if (error) throw error;
  return session;
}

// ── Public API ─────────────────────────────────────────────────────────

export const authService = {
  /** 统一登录入口 */
  async login(method: LoginMethod, credentials: LoginCredentials) {
    switch (method) {
      case "email":
        if (!credentials.email || !credentials.password) {
          throw new Error("邮箱和密码不能为空");
        }
        return emailLogin(credentials.email, credentials.password);
      case "wechat":
        if (!credentials.code) {
          throw new Error("微信登录需要授权 code");
        }
        return wechatLogin(credentials.code);
      case "phone":
        throw new Error("手机号登录暂未开放");
      default:
        throw new Error(`不支持的登录方式: ${method}`);
    }
  },

  /** 邮箱注册（可附带身份/兴趣元数据） */
  async register(
    email: string,
    password: string,
    metadata?: Record<string, string>
  ) {
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    if (error) throw error;
    return data;
  },

  /** 退出登录 */
  async logout() {
    await getSupabase().auth.signOut();
  },

  /** 获取当前用户 */
  async getUser() {
    const { data } = await getSupabase().auth.getUser();
    return data.user ?? null;
  },

  /** 获取 Supabase auth token（从本地存储） */
  _getToken(): Record<string, unknown> | null {
    if (!isBrowser()) return null;
    return storage.getJSON<Record<string, unknown>>(getSupabaseAuthStorageKey());
  },

  /** 检查是否登录（同步，从 storage 读取） */
  isLoggedIn(): boolean {
    const parsed = this._getToken();
    if (!parsed) return false;
    return !!(parsed as Record<string, unknown>)?.access_token;
  },

  /** 检查是否是管理员 */
  isAdmin(): boolean {
    const parsed = this._getToken();
    if (!parsed) return false;
    const email =
      ((parsed as Record<string, Record<string, string>>)?.user?.email) || "";
    const adminEmail = getAdminEmail();
    return !!adminEmail && email === adminEmail;
  },

  /** 发送密码重置邮件 */
  async resetPassword(email: string) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.yovigo.cn";
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth?reset=1`,
    });
    if (error) throw error;
  },

  /** 监听认证状态变化 */
  onAuthChange(callback: (user: { email?: string } | null) => void) {
    const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
    return data.subscription;
  },
};
