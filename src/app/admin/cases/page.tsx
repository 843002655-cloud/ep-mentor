"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminNav from "@/components/AdminNav";
import { caseService } from "@/lib/services";
import { SkeletonPage } from "@/components/Skeleton";
import type { CaseInput } from "@/lib/services";

interface Case { id: string; title: string; category: string; difficulty: string; description: string; ecg_findings: string[]; question: string; hint: string; key_points: string[]; is_published: boolean; mapping_system?: string; video_url?: string; }

const empty: CaseInput = { title: "", category: "SVT", difficulty: "基础", description: "", ecg_findings: [""], question: "", hint: "", key_points: [""], is_published: false, mapping_system: "", video_url: "" };
const catColors: Record<string, string> = { SVT: "bg-[#EBF2FA] text-[#1B4F8A]", VT: "bg-[#FDE8E8] text-[#9B2C2C]", AF: "bg-[#FEF3E2] text-[#854F0B]" };
const inputClass = "w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#C5D3E0] dark:border-slate-600 rounded text-[#1A2332] dark:text-slate-100 text-sm focus:outline-none focus:border-[#1B4F8A] dark:focus:border-blue-400";

export default function AdminCasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<CaseInput>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchCases = async () => {
    const { cases } = await caseService.getCases();
    setCases(cases);
    setLoading(false);
  };
  useEffect(() => { fetchCases(); }, []);

  const handleEdit = (c: Case) => { setEditingId(c.id); setForm({ title: c.title, category: c.category as CaseInput["category"], difficulty: c.difficulty as CaseInput["difficulty"], description: c.description, ecg_findings: c.ecg_findings || [""], question: c.question, hint: c.hint, key_points: c.key_points || [""], is_published: c.is_published, mapping_system: c.mapping_system || "", video_url: c.video_url || "" }); setIsNew(false); };
  const handleNew = () => { setEditingId(null); setForm(empty); setIsNew(true); };
  const handleSave = async () => {
    setSaving(true);
    if (isNew) await caseService.createCase(form);
    else if (editingId) await caseService.updateCase(editingId, form);
    setEditingId(null); setIsNew(false); setSaving(false); fetchCases();
  };
  const handleDelete = async (id: string) => { if (!confirm("确定删除？")) return; await caseService.deleteCase(id); fetchCases(); };
  const handleToggle = async (c: Case) => { await caseService.togglePublish(c.id, !c.is_published); fetchCases(); };

  return (
    <AppLayout>
      <AdminNav />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8"><div><h1 className="text-2xl sm:text-3xl font-bold text-[#1A2332] dark:text-slate-100 mb-1 sm:mb-2 font-serif">病例管理</h1><p className="text-[#6B7F96] dark:text-slate-400 text-sm">增删改查病例</p></div><div className="flex items-center gap-2"><a href="/admin/generate" className="btn-primary text-sm px-4">🤖 AI 生成</a><button onClick={handleNew} className="btn-secondary text-sm px-3">+ 新建</button></div></div>
        {(isNew || editingId) && (
          <div className="card mb-8 border border-[#1B4F8A]/30">
            <h2 className="text-xl font-semibold text-[#1A2332] dark:text-slate-100 mb-4">{isNew ? "新建病例" : "编辑病例"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div><label className="block text-sm font-medium text-[#3D5166] dark:text-slate-300 mb-1">标题</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} /></div>
              <div><label className="block text-sm font-medium text-[#3D5166] dark:text-slate-300 mb-1">分类</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as CaseInput["category"] })} className={inputClass}>{["SVT","VT","AF"].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-[#3D5166] dark:text-slate-300 mb-1">难度</label><select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as CaseInput["difficulty"] })} className={inputClass}>{["基础","进阶","高级"].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-[#3D5166] dark:text-slate-300 mb-1">标测系统</label><select value={form.mapping_system || ""} onChange={(e) => setForm({ ...form, mapping_system: e.target.value })} className={inputClass}><option value="">未指定</option>{["Carto","EnSite","Rhythmia","Other"].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-[#3D5166] dark:text-slate-300 mb-1">视频链接（可选）</label><input value={form.video_url || ""} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://..." className={inputClass} /></div>
              <div><label className="block text-sm font-medium text-[#3D5166] dark:text-slate-300 mb-1">核心提问</label><input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} className={inputClass} /></div>
            </div>
            <div className="mb-4"><label className="block text-sm font-medium text-[#3D5166] dark:text-slate-300 mb-1">病史摘要</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={`${inputClass} resize-none`} /></div>
            <div className="mb-4"><label className="block text-sm font-medium text-[#3D5166] dark:text-slate-300 mb-1">教学提示</label><input value={form.hint} onChange={(e) => setForm({ ...form, hint: e.target.value })} className={inputClass} /></div>
            <div className="flex items-center gap-2 mb-4"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /><label className="text-sm text-[#3D5166]">发布</label></div>
            <div className="flex gap-3"><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? "保存中..." : "保存"}</button><button onClick={() => { setEditingId(null); setIsNew(false); }} className="btn-secondary">取消</button></div>
          </div>
        )}
        {loading ? <SkeletonPage variant="list" count={5} /> : (
          <div className="space-y-3">{cases.map((c) => (
            <div key={c.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
              <div className="flex items-start sm:items-center gap-3">
                <span className={`badge-category shrink-0 mt-0.5 sm:mt-0 ${catColors[c.category]||""}`}>{c.category}</span>
                <div className="min-w-0">
                  <div className="text-[#1A2332] dark:text-slate-100 font-medium text-sm sm:text-base truncate">{c.title}</div>
                  <div className="text-xs text-[#8FA0B4] dark:text-slate-500">{c.difficulty} | {c.is_published ? "🟢 已发布" : "⚪ 未发布"}</div>
                </div>
              </div>
              <div className="flex gap-2 ml-0 sm:ml-auto shrink-0">
                <button onClick={()=>handleToggle(c)} className="text-xs px-2.5 py-1.5 border border-[#C5D3E0] dark:border-slate-600 rounded text-[#4B6080] dark:text-slate-300 hover:text-[#1B4F8A] dark:hover:text-blue-400 hover:border-[#1B4F8A] dark:hover:border-blue-400 min-h-0">{c.is_published?"下架":"发布"}</button>
                <button onClick={()=>handleEdit(c)} className="text-xs px-2.5 py-1.5 border border-[#1B4F8A]/50 dark:border-blue-400/50 rounded text-[#1B4F8A] dark:text-blue-400 hover:bg-[#EBF2FA] dark:hover:bg-slate-700 min-h-0">编辑</button>
                <button onClick={()=>handleDelete(c.id)} className="text-xs px-2.5 py-1.5 border border-[#9B2C2C]/50 dark:border-red-400/50 rounded text-[#9B2C2C] dark:text-red-400 hover:bg-[#FDE8E8] dark:hover:bg-red-900/30 min-h-0">删除</button>
              </div>
            </div>
          ))}</div>
        )}
      </div>
    </AppLayout>
  );
}
