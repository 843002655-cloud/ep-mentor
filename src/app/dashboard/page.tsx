"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { getSupabase } from "@/lib/supabase";

interface ProgressItem { case_id: string; completed_at: string; cases: { title: string; category: string } | null; }

export default function DashboardPage() {
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [totalCases, setTotalCases] = useState(0);

  useEffect(() => {
    getSupabase().auth.getUser().then(({ data: { user } }) => { if (user) setUserEmail(user.email || ""); });
    fetch("/api/progress").then((r) => { if (r.ok) r.json().then((d) => { setProgress(d.progress || []); setTotalCases(d.totalCases || 0); }); }).finally(() => setLoading(false));
  }, []);

  const uniqueCases = new Set(progress.map((p) => p.case_id));
  const today = new Date().toISOString().split("T")[0];
  const todayCount = progress.filter((p) => p.completed_at?.startsWith(today)).length;
  const catColors: Record<string, string> = { SVT: "bg-[#EBF2FA] text-[#1B4F8A]", VT: "bg-[#FDE8E8] text-[#9B2C2C]", AF: "bg-[#FEF3E2] text-[#854F0B]", AFL: "bg-[#EDE9FB] text-[#4C3D9E]" };

  if (loading) return <AppLayout><div className="max-w-4xl mx-auto px-4 py-12 text-center text-[#6B7F96]">加载中...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-[#1A2332] mb-2 font-serif">学习进度</h1>
        <p className="text-[#6B7F96] mb-8">{userEmail}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[{ v: uniqueCases.size, l: "完成病例", c: "text-[#1B4F8A]" }, { v: totalCases, l: "总病例数", c: "text-[#4C3D9E]" }, { v: todayCount, l: "今日对话", c: "text-[#0F6E56]" }, { v: totalCases > 0 ? `${Math.round((uniqueCases.size / totalCases) * 100)}%` : "0%", l: "完成率", c: "text-[#854F0B]" }].map((s, i) => (
            <div key={i} className="card text-center"><div className={`text-2xl font-bold ${s.c}`}>{s.v}</div><div className="text-sm text-[#6B7F96] mt-1">{s.l}</div></div>
          ))}
        </div>
        <h2 className="text-xl font-semibold text-[#1A2332] mb-4 font-serif">最近学习</h2>
        {progress.length === 0 ? (
          <div className="card text-center text-[#6B7F96]">还没有学习记录，去<a href="/cases" className="text-[#1B4F8A] mx-1">病例库</a>开始学习吧！</div>
        ) : (
          <div className="space-y-3">{progress.slice(0, 20).map((p, i) => (
            <div key={i} className="card flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                {p.cases?.category && <span className={`badge-category ${catColors[p.cases.category] || ""}`}>{p.cases.category}</span>}
                <span className="text-[#1A2332]">{p.cases?.title || "未知"}</span>
              </div>
              <span className="text-sm text-[#8FA0B4]">{new Date(p.completed_at).toLocaleDateString("zh-CN")}</span>
            </div>
          ))}</div>
        )}
      </div>
    </AppLayout>
  );
}
