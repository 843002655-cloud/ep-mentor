"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { authService } from "@/lib/services";

function AuthForm() {
  const [email, setEmail] = useState("843002655@qq.com");
  const [password, setPassword] = useState("");
  const searchParams = useSearchParams();
  const [isRegister, setIsRegister] = useState(searchParams.get("register") === "1");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const redirect = searchParams.get("redirect") || "/cases";

  const handleAuth = async () => {
    setLoading(true); setMessage("");
    try {
      if (isRegister) {
        const data = await authService.register(email, password);
        if (data.session) { window.location.href = redirect; return; }
        if (data.user?.identities?.length === 0) { setMessage("该邮箱已注册，请直接登录"); }
        else { window.location.href = redirect; }
      } else {
        const data = await authService.login(email, password);
        if (data.session) { window.location.replace(redirect); return; }
        setMessage("登录失败：未获取到会话");
      }
    } catch (err: unknown) { setMessage("异常：" + ((err as Error).message || "未知错误")); }
    finally { setLoading(false); }
  };

  return (
    <AppLayout>
      <div className="max-w-md mx-auto px-4 py-24">
        <div className="card">
          <h1 className="text-2xl font-bold text-[#1A2332] text-center mb-2 font-serif">{isRegister ? "注册" : "登录"}</h1>
          <p className="text-sm text-[#6B7F96] text-center mb-8">{isRegister ? "创建账号开始学习" : "欢迎回到 EP Mentor"}</p>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-[#3D5166] mb-1">邮箱</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-[#C5D3E0] rounded-lg text-[#1A2332] placeholder-[#8FA0B4] focus:outline-none focus:border-[#1B4F8A] transition-colors" /></div>
            <div><label className="block text-sm font-medium text-[#3D5166] mb-1">密码</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-[#C5D3E0] rounded-lg text-[#1A2332] placeholder-[#8FA0B4] focus:outline-none focus:border-[#1B4F8A] transition-colors" /></div>
            {message && <div className={`text-sm p-3 rounded-lg ${message.includes("成功") ? "bg-[#E8F4F0] text-[#0F6E56] border border-[#0F6E56]/20" : "bg-[#FDE8E8] text-[#9B2C2C] border border-[#9B2C2C]/20"}`}>{message}</div>}
            <button onClick={handleAuth} disabled={loading} className="btn-primary w-full py-2.5 disabled:opacity-50">{loading ? "处理中..." : isRegister ? "注册" : "登录"}</button>
          </div>
          <div className="mt-6 text-center">
            <button onClick={() => { setIsRegister(!isRegister); setMessage(""); }} className="text-sm text-[#1B4F8A] hover:text-[#154070] hover:underline transition-colors">{isRegister ? "已有账号？去登录" : "没有账号？去注册"}</button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[#F5F8FC]"><p className="text-[#6B7F96]">加载中...</p></div>}>
      <AuthForm />
    </Suspense>
  );
}
