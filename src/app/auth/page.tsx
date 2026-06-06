"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { authService } from "@/lib/services";
import { navigateTo, replaceTo } from "@/lib/browser";

const roles = [
  { value: "resident", label: "住院医 / 进修生" },
  { value: "junior", label: "初级术者（SVT / 典型房扑）" },
  { value: "mid", label: "中级术者（房颤 PVI）" },
  { value: "senior", label: "高级术者（室速基质消融）" },
  { value: "other", label: "其他" },
];

const subspecialties = [
  { key: "svt", label: "SVT" },
  { key: "af", label: "房颤" },
  { key: "vt", label: "室速" },
  { key: "afl", label: "房扑" },
  { key: "device", label: "起搏 / ICD" },
  { key: "pedia", label: "小儿 EP" },
];

const inputClass =
  "w-full px-4 py-2.5 bg-white border border-[#C5D3E0] rounded-lg text-[#1A2332] placeholder-[#8FA0B4] focus:outline-none focus:border-[#1B4F8A] transition-colors";

function AuthForm() {
  const searchParams = useSearchParams();
  const [isRegister, setIsRegister] = useState(searchParams.get("register") === "1");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const redirect = searchParams.get("redirect") || "/cases";
  const [email, setEmail] = useState("843002655@qq.com");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("resident");
  const [interests, setInterests] = useState<string[]>([]);

  const toggleInterest = (key: string) => {
    setInterests((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleAuth = async () => {
    setLoading(true);
    setMessage("");
    try {
      if (isRegister) {
        const data = await authService.register(email, password, {
          role,
          interests: interests.join(","),
          registered_at: new Date().toISOString(),
        });
        if (data.session) { navigateTo(redirect); return; }
        if (data.user?.identities?.length === 0) {
          setMessage("该邮箱已注册，请直接登录");
        } else {
          navigateTo(redirect);
        }
      } else {
        const data = await authService.login("email", { email, password });
        if (!data || "error" in data) {
          setMessage("登录失败");
          return;
        }
        if (data.session) { replaceTo(redirect); return; }
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
      <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
        <div className="card">
          <h1 className="text-2xl font-bold text-[#1A2332] text-center mb-2 font-serif">
            {isRegister ? "注册" : "登录"}
          </h1>
          <p className="text-sm text-[#6B7F96] text-center mb-6">
            {isRegister ? "选择你的身份，开始个性化学习" : "欢迎回到 EP Mentor"}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#3D5166] mb-1">邮箱</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3D5166] mb-1">密码</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="至少 6 位" />
            </div>

            {/* Role selection — registration only */}
            {isRegister && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#3D5166] mb-2">身份</label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {roles.map((r) => (
                      <label key={r.value} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${role === r.value ? "border-[#1B4F8A] bg-[#EBF2FA] text-[#1B4F8A]" : "border-[#C5D3E0] text-[#3D5166] hover:border-[#1B4F8A]"}`}>
                        <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} className="sr-only" />
                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${role === r.value ? "border-[#1B4F8A]" : "border-[#C5D3E0]"}`}>
                          {role === r.value && <span className="w-2 h-2 rounded-full bg-[#1B4F8A]" />}
                        </span>
                        {r.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#3D5166] mb-2">感兴趣的亚专业（可多选）</label>
                  <div className="flex flex-wrap gap-2">
                    {subspecialties.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => toggleInterest(s.key)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${interests.includes(s.key) ? "border-[#1B4F8A] bg-[#EBF2FA] text-[#1B4F8A]" : "border-[#C5D3E0] text-[#6B7F96] hover:border-[#1B4F8A]"}`}
                      >
                        {interests.includes(s.key) && "✓ "}{s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {message && (
              <div className={`text-sm p-3 rounded-lg ${message.includes("成功") ? "bg-[#E8F4F0] text-[#0F6E56] border border-[#0F6E56]/20" : "bg-[#FDE8E8] text-[#9B2C2C] border border-[#9B2C2C]/20"}`}>
                {message}
              </div>
            )}

            <button onClick={handleAuth} disabled={loading} className="btn-primary w-full py-2.5 disabled:opacity-50">
              {loading ? "处理中..." : isRegister ? "注册" : "登录"}
            </button>
          </div>

          <div className="mt-6 text-center">
            <button onClick={() => { setIsRegister(!isRegister); setMessage(""); }} className="text-sm text-[#1B4F8A] hover:text-[#154070] hover:underline transition-colors">
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
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[#F5F8FC]"><p className="text-[#6B7F96]">准备中...</p></div>}>
      <AuthForm />
    </Suspense>
  );
}
