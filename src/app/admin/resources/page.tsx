"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";

interface Resource { id: string; title: string; category: string; source: string; url: string; summary: string; created_at: string; }

const empty = { title: "", category: "指南", source: "", url: "", summary: "" };
const cats = ["指南", "文献", "视频", "工具", "其他"];

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchRes = async () => {
    const res = await fetch("/api/resources");
    const data = await res.json();
    setResources(data.resources || []);
    setLoading(false);
  };

  useEffect(() => { fetchRes(); }, []);

  const handleEdit = (r: Resource) => { setEditingId(r.id); setForm({ title: r.title, category: r.category, source: r.source, url: r.url, summary: r.summary }); setIsNew(false); setMessage(""); };
  const handleNew = () => { setEditingId(null); setForm(empty); setIsNew(true); setMessage(""); };

  const handleSave = async () => {
    if (!form.title || !form.url) { setMessage("标题和链接为必填"); return; }
    setSaving(true); setMessage("");
    if (isNew) {
      await fetch("/api/resources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else if (editingId) {
      await fetch(`/api/resources/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    setEditingId(null); setIsNew(false); setSaving(false); setMessage("保存成功！"); fetchRes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除？")) return;
    await fetch(`/api/resources/${id}`, { method: "DELETE" });
    fetchRes();
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div><h1 className="text-3xl font-bold text-white mb-2">资料管理</h1><p className="text-ep-muted">管理学习资料库</p></div>
          <button onClick={handleNew} className="btn-secondary">+ 添加资料</button>
        </div>

        {(isNew || editingId) && (
          <div className="card mb-8 border border-ep-primary/30">
            <h2 className="text-xl font-semibold text-white mb-4">{isNew ? "添加资料" : "编辑资料"}</h2>
            {message && <div className={`text-sm p-3 rounded-lg mb-4 ${message.includes("成功") ? "bg-green-900/30 text-green-400 border border-green-800" : "bg-red-900/30 text-red-400 border border-red-800"}`}>{message}</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ep-muted mb-1">标题 <span className="text-red-500">*</span></label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 bg-ep-bg border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-ep-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ep-muted mb-1">分类</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 bg-ep-bg border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-ep-primary">
                    {cats.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-ep-muted mb-1">来源</label><input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="w-full px-3 py-2 bg-ep-bg border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-ep-primary" /></div>
                <div><label className="block text-sm font-medium text-ep-muted mb-1">链接 <span className="text-red-500">*</span></label><input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="w-full px-3 py-2 bg-ep-bg border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-ep-primary" /></div>
              </div>
              <div><label className="block text-sm font-medium text-ep-muted mb-1">简介</label><textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={2} className="w-full px-3 py-2 bg-ep-bg border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-ep-primary resize-none" /></div>
              <div className="flex gap-3">
                <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? "保存中..." : "保存"}</button>
                <button onClick={() => { setEditingId(null); setIsNew(false); setMessage(""); }} className="px-4 py-2 border border-slate-600 rounded-lg text-sm text-ep-muted hover:text-white">取消</button>
              </div>
            </div>
          </div>
        )}

        {loading ? <div className="text-center py-20 text-ep-muted">加载中...</div> : (
          <div className="space-y-3">
            {resources.map((r) => (
              <div key={r.id} className="card flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-ep-muted whitespace-nowrap">{r.category}</span>
                  <div className="min-w-0"><div className="text-white font-medium truncate">{r.title}</div><div className="text-xs text-ep-muted truncate">{r.source} • {r.url}</div></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(r)} className="text-xs px-3 py-1 border border-ep-primary/50 rounded text-ep-primary hover:bg-ep-primary/10">编辑</button>
                  <button onClick={() => handleDelete(r.id)} className="text-xs px-3 py-1 border border-diff-advanced/50 rounded text-diff-advanced hover:bg-diff-advanced/10">删除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
