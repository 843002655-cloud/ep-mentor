"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { getSupabase } from "@/lib/supabase";

interface ProgressItem {
  case_id: string;
  completed_at: string;
  cases: { title: string; category: string } | null;
}

export default function DashboardPage() {
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [totalCases, setTotalCases] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (user) setUserEmail(user.email || "");

      try {
        const res = await fetch("/api/progress");
        if (res.ok) {
          const data = await res.json();
          setProgress(data.progress || []);
          setTotalCases(data.totalCases || 0);
        }
      } catch {}
      setLoading(false);
    };
    fetchData();
  }, []);

  const uniqueCases = new Set(progress.map((p) => p.case_id));
  const today = new Date().toISOString().split("T")[0];
  const todayCount = progress.filter((p) => p.completed_at?.startsWith(today)).length;

  const catColors: Record<string, string> = { SVT: "bg-svt/20 text-svt", VT: "bg-vt/20 text-vt", AF: "bg-af/20 text-af", WPW: "bg-wpw/20 text-wpw" };

  if (loading) return <AppLayout><div className="max-w-4xl mx-auto px-4 py-12 text-center text-ep-muted">加载中...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">学习进度</h1>
        <p className="text-ep-muted mb-8">{userEmail}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { v: uniqueCases.size, l: "完成病例", c: "text-ep-primary" },
            { v: totalCases, l: "总病例数", c: "text-ep-secondary" },
            { v: todayCount, l: "今日对话", c: "text-diff-basic" },
            { v: totalCases > 0 ? `${Math.round((uniqueCases.size / totalCases) * 100)}%` : "0%", l: "完成率", c: "text-diff-intermediate" },
          ].map((s, i) => (
            <div key={i} className="card text-center">
              <div className={`text-2xl font-bold ${s.c}`}>{s.v}</div>
              <div className="text-sm text-ep-muted mt-1">{s.l}</div>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-semibold text-white mb-4">最近学习</h2>
        {progress.length === 0 ? (
          <div className="card text-center text-ep-muted">还没有学习记录，去<a href="/cases" className="text-ep-primary mx-1">病例库</a>开始学习吧！</div>
        ) : (
          <div className="space-y-3">
            {progress.slice(0, 20).map((p, i) => (
              <div key={i} className="card flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  {p.cases?.category && <span className={`badge-category ${catColors[p.cases.category] || ""}`}>{p.cases.category}</span>}
                  <span className="text-white">{p.cases?.title || "未知"}</span>
                </div>
                <span className="text-sm text-ep-muted">{new Date(p.completed_at).toLocaleDateString("zh-CN")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
