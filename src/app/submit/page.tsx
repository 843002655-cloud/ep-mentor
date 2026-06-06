"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";

export default function SubmitPage() {
  const router = useRouter();
  const [form, setForm] = useState({ doctor_name: "", hospital: "", case_title: "", case_content: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提交失败");
      setSuccess(true);
    } catch (err: unknown) {
      setMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AppLayout>
        <div className="max-w-xl mx-auto px-4 py-24 text-center">
          <div className="card">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-white mb-2">提交成功</h2>
            <p className="text-ep-muted mb-6">投稿已提交，等待管理员审核。</p>
            <button onClick={() => router.push("/cases")} className="btn-primary">返回病例库</button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">病例投稿</h1>
        <p className="text-ep-muted mb-8">提交你的真实脱敏病例</p>
        <div className="card">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-6">
            <p className="text-sm text-ep-muted">⚠️ <strong>重要：</strong>请务必去除所有患者隐私信息。</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {["doctor_name", "hospital", "case_title"].map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-ep-muted mb-1">
                  {field === "doctor_name" ? "医生姓名" : field === "hospital" ? "医院" : "病例标题"} <span className="text-diff-advanced">*</span>
                </label>
                <input type="text" name={field} required
                  value={form[field as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  className="w-full px-4 py-2.5 bg-ep-bg border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-ep-primary transition-colors"
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-ep-muted mb-1">病例内容 <span className="text-diff-advanced">*</span></label>
              <textarea name="case_content" required rows={8} value={form.case_content}
                onChange={(e) => setForm({ ...form, case_content: e.target.value })}
                className="w-full px-4 py-2.5 bg-ep-bg border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-ep-primary resize-none"
                placeholder="请描述：1. 患者基本信息 2. 主诉和病史 3. 心电图表现 4. 诊治经过 5. 讨论要点"
              />
            </div>
            {message && <div className="text-sm p-3 rounded-lg bg-red-900/30 text-red-400 border border-red-800">{message}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 disabled:opacity-50">
              {loading ? "提交中..." : "提交投稿"}
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
