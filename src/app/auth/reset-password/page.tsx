"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { authService } from "@/lib/services";
import { getSupabase } from "@/lib/supabase";
import { navigateTo } from "@/lib/browser";
import { usePageTitle } from "@/lib/hooks/usePageTitle";

const inputClass =
  "w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-[#C5D3E0] dark:border-slate-600 rounded-lg text-[#1A2332] dark:text-slate-100 placeholder-[#8FA0B4] dark:placeholder-slate-500 focus:outline-none focus:border-[#1B4F8A] dark:focus:border-blue-400 transition-colors";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const code = searchParams.get("code");
    if (code) {
      const next = encodeURIComponent("/auth/reset-password");
      window.location.replace(
        `/auth/callback?code=${encodeURIComponent(code)}&next=${next}`
      );
      return;
    }

    if (searchParams.get("error") === "callback") {
      setMessage("链接无效或已过期，请重新申请重置邮件");
      return;
    }

    const supabase = getSupabase();

    if (window.location.hash.includes("type=recovery")) {
      setReady(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, [searchParams]);

  const handleSave = async () => {
    if (!password || password.length < 6) {
      setMessage("密码至少 6 位");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("两次密码不一致");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      await authService.updatePassword(password);
      setMessage("密码已更新，正在跳转...");
      navigateTo("/admin");
    } catch (err: unknown) {
      setMessage(
        "设置失败：" +
          ((err as Error).message || "请重新申请重置邮件，或使用服务器脚本改密码")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
        <div className="card">
          <h1 className="text-2xl font-bold text-center mb-2 font-serif">设置新密码</h1>
          <p className="text-sm text-[#6B7F96] dark:text-slate-400 text-center mb-6">
            {ready
              ? "请为管理员账号设置新密码（至少 6 位）"
              : "正在验证重置链接..."}
          </p>

          {ready ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium mb-1">
                  新密码
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="至少 6 位"
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium mb-1">
                  确认新密码
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  placeholder="再次输入"
                />
              </div>
              {message && (
                <div className="text-sm p-3 rounded-lg bg-[#FDE8E8] dark:bg-red-900/30 text-[#9B2C2C] dark:text-red-300">
                  {message}
                </div>
              )}
              <button
                onClick={handleSave}
                disabled={loading}
                className="btn-primary w-full py-2.5 disabled:opacity-50"
              >
                {loading ? "保存中..." : "保存新密码"}
              </button>
            </div>
          ) : (
            <p className="text-sm text-center text-[#6B7F96]">
              {message || "若长时间停留在此页，请关闭后重新点击邮件链接"}
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default function ResetPasswordPage() {
  usePageTitle("重置密码");
  return (
    <Suspense fallback={<div className="p-16 text-center">加载中...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
