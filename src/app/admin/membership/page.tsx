"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminNav from "@/components/AdminNav";

export default function AdminMembershipPage() {
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<"pro" | "institution" | "free">("pro");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/membership/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "开通失败");
      setMessage(`已为 ${email} 开通 ${plan} 会员`);
      setEmail("");
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#C5D3E0] dark:border-slate-600 rounded-lg text-sm text-[#1A2332] dark:text-slate-100 focus:outline-none focus:border-[#1B4F8A] dark:focus:border-blue-400";

  return (
    <AppLayout>
      <AdminNav />
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[#1A2332] dark:text-slate-100 font-serif mb-2">
          会员开通
        </h1>
        <p className="text-sm text-[#6B7F96] dark:text-slate-400 mb-6">
          用户扫码支付后，在此手动开通会员（备注注册邮箱）
        </p>
        <form onSubmit={handleActivate} className="card space-y-4">
          <div>
            <label htmlFor="member-email" className="block text-sm font-medium text-[#3D5166] dark:text-slate-300 mb-1">
              用户注册邮箱
            </label>
            <input
              id="member-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="member-plan" className="block text-sm font-medium text-[#3D5166] dark:text-slate-300 mb-1">
              会员方案
            </label>
            <select
              id="member-plan"
              value={plan}
              onChange={(e) => setPlan(e.target.value as typeof plan)}
              className={inputClass}
            >
              <option value="pro">Pro 个人会员</option>
              <option value="institution">机构版</option>
              <option value="free">恢复免费</option>
            </select>
          </div>
          {message && (
            <p className={`text-sm ${message.includes("开通") ? "text-[#0F6E56] dark:text-emerald-400" : "text-[#9B2C2C] dark:text-red-300"}`}>
              {message}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? "处理中..." : "确认开通"}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
