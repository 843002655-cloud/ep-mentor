"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";

interface Submission {
  id: string;
  doctor_name: string;
  hospital: string;
  case_title: string;
  case_content: string;
  status: string;
  created_at: string;
}

const statusColors: Record<string, string> = { pending: "bg-diff-intermediate/20 text-diff-intermediate", approved: "bg-diff-basic/20 text-diff-basic", rejected: "bg-diff-advanced/20 text-diff-advanced" };

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  const fetchSubmissions = async () => {
    setLoading(true);
    const params = filter ? `?status=${filter}` : "";
    const res = await fetch(`/api/submissions${params}`);
    const data = await res.json();
    setSubmissions(data.submissions || []);
    setLoading(false);
  };

  useEffect(() => { fetchSubmissions(); }, [filter]);

  const handleReview = async (id: string, status: string) => {
    await fetch(`/api/submissions/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    fetchSubmissions();
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div><h1 className="text-3xl font-bold text-white mb-2">投稿审核</h1><p className="text-ep-muted">查看和审核医生提交的病例</p></div>
          <div className="flex gap-2">
            {[{ v: "pending", l: "待审核" }, { v: "approved", l: "已通过" }, { v: "rejected", l: "已拒绝" }, { v: "", l: "全部" }].map((s) => (
              <button key={s.v} onClick={() => setFilter(s.v)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${filter === s.v ? "bg-ep-primary/20 text-ep-primary border-ep-primary/50" : "bg-ep-card text-ep-muted border-slate-700 hover:border-slate-500"}`}>{s.l}</button>
            ))}
          </div>
        </div>

        {loading ? <div className="text-center py-20 text-ep-muted">加载中...</div>
        : submissions.length === 0 ? <div className="text-center py-20 text-ep-muted">暂无投稿</div>
        : <div className="space-y-4">
            {submissions.map((s) => (
              <div key={s.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{s.case_title}</span>
                    <span className={`badge-category ${statusColors[s.status]}`}>{s.status === "pending" ? "待审核" : s.status === "approved" ? "已通过" : "已拒绝"}</span>
                  </div>
                  <span className="text-xs text-ep-muted">{new Date(s.created_at).toLocaleDateString("zh-CN")}</span>
                </div>
                <div className="flex items-center gap-4 mb-3 text-sm text-ep-muted">
                  <span>医生：{s.doctor_name}</span><span>医院：{s.hospital}</span>
                </div>
                <div className="bg-ep-bg rounded-lg p-4 mb-4"><p className="text-sm text-white whitespace-pre-wrap">{s.case_content}</p></div>
                {s.status === "pending" && (
                  <div className="flex gap-3">
                    <button onClick={() => handleReview(s.id, "approved")} className="px-4 py-2 bg-diff-basic/20 text-diff-basic border border-diff-basic/50 rounded-lg text-sm hover:bg-diff-basic/30">✓ 通过</button>
                    <button onClick={() => handleReview(s.id, "rejected")} className="px-4 py-2 bg-diff-advanced/20 text-diff-advanced border border-diff-advanced/50 rounded-lg text-sm hover:bg-diff-advanced/30">✗ 拒绝</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        }
      </div>
    </AppLayout>
  );
}
