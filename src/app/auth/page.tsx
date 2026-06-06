"use client";

import { useState, Suspense } from "react";
import { getSupabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";

function AuthForm() {
  const [email, setEmail] = useState("843002655@qq.com");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/cases";

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (isRegister) {
        // 注册
        const { data, error } = await getSupabase().auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        // Supabase 默认邮箱确认关闭后，注册即登录
        if (data.session) {
          window.location.href = redirect;
          return;
        }
        // 如果还需要邮箱确认
        if (data.user?.identities?.length === 0) {
          setMessage("该邮箱已注册，请直接登录");
        } else {
          window.location.href = redirect;
        }
      } else {
        const { data, error } = await getSupabase().auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setMessage("登录失败：" + error.message);
          return;
        }
        if (data.session) {
          window.location.replace(redirect);
          return;
        }
        setMessage("登录失败：未获取到会话");
      }
    } catch (err: unknown) {
      setMessage("异常：" + ((err as Error).message || "未知错误"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-md mx-auto px-4 py-24">
        <div className="card">
          <h1 className="text-2xl font-bold text-white text-center mb-2">
            {isRegister ? "注册" : "登录"}
          </h1>
          <p className="text-sm text-ep-muted text-center mb-8">
            {isRegister ? "创建账号开始学习" : "欢迎回到 EP Mentor"}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ep-muted mb-1">
                邮箱
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-ep-bg border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-ep-primary transition-colors"
                placeholder="843002655@qq.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ep-muted mb-1">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-ep-bg border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-ep-primary transition-colors"
                placeholder="••••••••"
              />
            </div>

            {message && (
              <div
                className={`text-sm p-3 rounded-lg ${
                  message.includes("成功")
                    ? "bg-green-900/30 text-green-400 border border-green-800"
                    : "bg-red-900/30 text-red-400 border border-red-800"
                }`}
              >
                {message}
              </div>
            )}

            <button
              onClick={() => handleAuth({ preventDefault: () => {} } as React.FormEvent)}
              disabled={loading}
              className="btn-primary w-full py-2.5 disabled:opacity-50"
            >
              {loading ? "处理中..." : isRegister ? "注册" : "登录"}
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setMessage("");
              }}
              className="text-sm text-ep-primary hover:underline"
            >
              {isRegister ? "已有账号？去登录" : "没有账号？去注册"}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-ep-bg">
          <p className="text-ep-muted">加载中...</p>
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
