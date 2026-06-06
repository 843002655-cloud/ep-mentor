"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";

interface Submission { id: string; doctor_name: string; hospital: string; case_title: string; case_content: string; status: string; created_at: string; }
const statusColors: Record<string, string> = { pending: "bg-[#FEF3E2] text-[#854F0B]", approved: "bg-[#E8F4F0] text-[#0F6E56]", rejected: "bg-[#FDE8E8] text-[#9B2C2C]" };

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  const fetchSubmissions = async () => {
    setLoading(true);
    const res = await fetch(`/api/submissions${filter ? `?status=${filter}` : ""}`);
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
          <div><h1 className="text-3xl font-bold text-[#1A2332] mb-2 font-serif">投稿审核</h1><p className="text-[#6B7F96]">查看和审核医生提交的病例</p></div>
          <div className="flex gap-2">
            {[{ v: "pending", l: "待审核" }, { v: "approved", l: "已通过" }, { v: "rejected", l: "已拒绝" }, { v: "", l: "全部" }].map((s) => (
              <button key={s.v} onClick={() => setFilter(s.v)} className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${filter === s.v ? "bg-[#1B4F8A] text-white border-[#1B4F8A]" : "bg-white text-[#4B6080] border-[#C5D3E0] hover:border-[#1B4F8A]"}`}>{s.l}</button>
            ))}
          </div>
        </div>
        {loading ? <div className="text-center py-20 text-[#6B7F96]">加载中...</div>
        : submissions.length === 0 ? <div className="text-center py-20 text-[#6B7F96]">暂无投稿</div>
        : <div className="space-y-4">{submissions.map((s) => (
            <div key={s.id} className="card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><span className="text-[#1A2332] font-medium">{s.case_title}</span><span className={`badge-category ${statusColors[s.status]}`}>{s.status === "pending" ? "待审核" : s.status === "approved" ? "已通过" : "已拒绝"}</span></div>
                <span className="text-xs text-[#8FA0B4]">{new Date(s.created_at).toLocaleDateString("zh-CN")}</span>
              </div>
              <div className="flex items-center gap-4 mb-3 text-sm text-[#6B7F96]"><span>医生：{s.doctor_name}</span><span>医院：{s.hospital}</span></div>
              <div className="bg-[#F5F8FC] rounded-lg p-4 mb-4"><p className="text-sm text-[#3D5166] whitespace-pre-wrap">{s.case_content}</p></div>
              {s.status === "pending" && (
                <div className="flex gap-3">
                  <button onClick={() => handleReview(s.id, "approved")} className="px-4 py-2 bg-[#E8F4F0] text-[#0F6E56] border border-[#0F6E56]/30 rounded-lg text-sm hover:bg-[#0F6E56]/10">✓ 通过</button>
                  <button onClick={() => handleReview(s.id, "rejected")} className="px-4 py-2 bg-[#FDE8E8] text-[#9B2C2C] border border-[#9B2C2C]/30 rounded-lg text-sm hover:bg-[#9B2C2C]/10">✗ 拒绝</button>
                </div>
              )}
            </div>
          ))}</div>
        }
      </div>
    </AppLayout>
  );
}
