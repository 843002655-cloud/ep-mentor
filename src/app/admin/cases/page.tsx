"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";

interface Case {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  description: string;
  ecg_findings: string[];
  question: string;
  hint: string;
  key_points: string[];
  is_published: boolean;
  created_at: string;
}

const emptyCase = { title: "", category: "SVT", difficulty: "基础", description: "", ecg_findings: [""], question: "", hint: "", key_points: [""], is_published: false };

const categoryColors: Record<string, string> = { SVT: "bg-svt/20 text-svt", VT: "bg-vt/20 text-vt", AF: "bg-af/20 text-af", AFL: "bg-afl/20 text-afl" };

export default function AdminCasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyCase);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchCases = async () => {
    const res = await fetch("/api/cases");
    const data = await res.json();
    setCases(data.cases || []);
    setLoading(false);
  };

  useEffect(() => { fetchCases(); }, []);

  const handleEdit = (c: Case) => {
    setEditingId(c.id);
    setForm({ title: c.title, category: c.category, difficulty: c.difficulty, description: c.description, ecg_findings: c.ecg_findings || [""], question: c.question, hint: c.hint, key_points: c.key_points || [""], is_published: c.is_published });
    setIsNew(false);
  };

  const handleNew = () => { setEditingId(null); setForm(emptyCase); setIsNew(true); };

  const handleSave = async () => {
    setSaving(true);
    if (isNew) {
      await fetch("/api/cases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else if (editingId) {
      await fetch(`/api/cases/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    setEditingId(null); setIsNew(false); setSaving(false); fetchCases();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除？")) return;
    await fetch(`/api/cases/${id}`, { method: "DELETE" });
    fetchCases();
  };

  const handleTogglePublish = async (c: Case) => {
    await fetch(`/api/cases/${c.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_published: !c.is_published }) });
    fetchCases();
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div><h1 className="text-3xl font-bold text-white mb-2">病例管理</h1><p className="text-ep-muted">增删改查病例，控制发布状态</p></div>
          <button onClick={handleNew} className="btn-secondary">+ 新建病例</button>
        </div>

        {(isNew || editingId) && (
          <div className="card mb-8 border border-ep-primary/30">
            <h2 className="text-xl font-semibold text-white mb-4">{isNew ? "新建病例" : "编辑病例"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-ep-muted mb-1">标题</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 bg-ep-bg border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-ep-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ep-muted mb-1">分类</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 bg-ep-bg border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-ep-primary">
                  {["SVT", "VT", "AF", "AFL"].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ep-muted mb-1">难度</label>
                <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className="w-full px-3 py-2 bg-ep-bg border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-ep-primary">
                  {["基础", "进阶", "高级"].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ep-muted mb-1">核心提问</label>
                <input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} className="w-full px-3 py-2 bg-ep-bg border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-ep-primary" />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-ep-muted mb-1">病史摘要</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 bg-ep-bg border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-ep-primary resize-none" />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-ep-muted mb-1">教学提示</label>
              <input value={form.hint} onChange={(e) => setForm({ ...form, hint: e.target.value })} className="w-full px-3 py-2 bg-ep-bg border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-ep-primary" />
            </div>
            <div className="flex items-center gap-2 mb-4">
              <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />
              <label className="text-sm text-ep-muted">发布</label>
            </div>
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? "保存中..." : "保存"}</button>
              <button onClick={() => { setEditingId(null); setIsNew(false); }} className="px-4 py-2 border border-slate-600 rounded-lg text-sm text-ep-muted hover:text-white">取消</button>
            </div>
          </div>
        )}

        {loading ? <div className="text-center py-20 text-ep-muted">加载中...</div> : (
          <div className="space-y-3">
            {cases.map((c) => (
              <div key={c.id} className="card flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="flex items-center gap-3">
                  <span className={`badge-category ${categoryColors[c.category] || ""}`}>{c.category}</span>
                  <div><div className="text-white font-medium">{c.title}</div><div className="text-xs text-ep-muted">{c.difficulty} | {c.is_published ? "🟢 已发布" : "⚪ 未发布"}</div></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleTogglePublish(c)} className="text-xs px-3 py-1 border border-slate-600 rounded text-ep-muted hover:text-white">{c.is_published ? "下架" : "发布"}</button>
                  <button onClick={() => handleEdit(c)} className="text-xs px-3 py-1 border border-ep-primary/50 rounded text-ep-primary hover:bg-ep-primary/10">编辑</button>
                  <button onClick={() => handleDelete(c.id)} className="text-xs px-3 py-1 border border-diff-advanced/50 rounded text-diff-advanced hover:bg-diff-advanced/10">删除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
