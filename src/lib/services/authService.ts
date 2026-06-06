// ── Auth Service ────────────────────────────────────────────────────────
// 登录、注册、用户状态查询。内部调用 Supabase 客户端（cookie 模式）。

import { getSupabase } from "@/lib/supabase";

export const authService = {
  /** 邮箱登录 */
  async login(email: string, password: string) {
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  /** 注册 */
  async register(email: string, password: string) {
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
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

  /** 检查是否登录（同步，从 localStorage 读取） */
  isLoggedIn(): boolean {
    if (typeof window === "undefined") return false;
    const token = localStorage.getItem("sb-kqoigeigwucvlpzbvboy-auth-token");
    if (!token) return false;
    try {
      const parsed = JSON.parse(token);
      return !!parsed?.access_token;
    } catch {
      return false;
    }
  },

  /** 检查是否是管理员 */
  isAdmin(): boolean {
    if (typeof window === "undefined") return false;
    const token = localStorage.getItem("sb-kqoigeigwucvlpzbvboy-auth-token");
    if (!token) return false;
    try {
      const parsed = JSON.parse(token);
      const email = parsed?.user?.email || "";
      const adminEmail =
        process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
        "843002655@qq.com";
      return email === adminEmail;
    } catch {
      return false;
    }
  },

  /** 监听认证状态变化 */
  onAuthChange(
    callback: (user: { email?: string } | null) => void
  ) {
    const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
    return data.subscription;
  },
};
