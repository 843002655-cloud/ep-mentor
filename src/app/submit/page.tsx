"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { ROUTES } from "@/lib/routes";

export default function SubmitPage() {
  const router = useRouter();
  const [form, setForm] = useState({ doctor_name: "", hospital: "", case_title: "", case_content: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMessage("");
    try {
      const res = await fetch("/api/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提交失败");
      setSuccess(true);
    } catch (err: unknown) { setMessage((err as Error).message); }
    finally { setLoading(false); }
  };

  if (success) return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="card"><div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-[#1A2332] mb-2 font-serif">提交成功</h2>
          <p className="text-[#6B7F96] mb-6">投稿已提交，等待管理员审核。</p>
          <button onClick={() => router.push(ROUTES.CASES)} className="btn-primary">返回病例库</button>
        </div>
      </div>
    </AppLayout>
  );

  const inputClass = "w-full px-4 py-2.5 bg-white border border-[#C5D3E0] rounded-lg text-[#1A2332] placeholder-[#8FA0B4] focus:outline-none focus:border-[#1B4F8A] transition-colors";

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-[#1A2332] mb-2 font-serif">病例投稿</h1>
        <p className="text-[#6B7F96] mb-8">提交你的真实脱敏病例</p>
        <div className="card">
          <div className="bg-[#FEF3E2] border border-[#854F0B]/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-[#854F0B]">⚠️ <strong>重要：</strong>请务必去除所有患者隐私信息。</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { name: "doctor_name", label: "医生姓名" },
              { name: "hospital", label: "医院" },
              { name: "case_title", label: "病例标题" },
            ].map((f) => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-[#3D5166] mb-1">{f.label} <span className="text-[#9B2C2C]">*</span></label>
                <input type="text" name={f.name} required value={form[f.name as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} className={inputClass} />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-[#3D5166] mb-1">病例内容 <span className="text-[#9B2C2C]">*</span></label>
              <textarea name="case_content" required rows={8} value={form.case_content}
                onChange={(e) => setForm({ ...form, case_content: e.target.value })} className={`${inputClass} resize-none`}
                placeholder="请描述：1. 患者基本信息 2. 主诉和病史 3. 心电图表现 4. 诊治经过 5. 讨论要点" />
            </div>
            {message && <div className="text-sm p-3 rounded-lg bg-[#FDE8E8] text-[#9B2C2C] border border-[#9B2C2C]/20">{message}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 disabled:opacity-50">{loading ? "提交中..." : "提交投稿"}</button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
