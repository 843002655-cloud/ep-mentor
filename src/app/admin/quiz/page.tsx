"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminNav from "@/components/AdminNav";

interface QuizQuestion { id: string; question: string; options: string[]; correct: number; explanation: string; category: string; }
const empty = { question: "", options: ["", "", "", ""], correct: 0, explanation: "", category: "SVT" };
const cats = ["SVT", "VT", "AF", "综合"];
const inputClass = "w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#C5D3E0] dark:border-slate-600 rounded text-[#1A2332] dark:text-slate-100 text-sm focus:outline-none focus:border-[#1B4F8A] dark:focus:border-blue-400";

export default function AdminQuizPage() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchQ = async () => { const r = await fetch("/api/quiz-questions"); setQuestions((await r.json()).questions || []); setLoading(false); };
  useEffect(() => { fetchQ(); }, []);

  const handleEdit = (q: QuizQuestion) => { setEditingId(q.id); setForm({ question: q.question, options: q.options || ["", "", "", ""], correct: q.correct, explanation: q.explanation, category: q.category }); setIsNew(false); setMessage(""); };
  const handleNew = () => { setEditingId(null); setForm(empty); setIsNew(true); setMessage(""); };
  const handleSave = async () => {
    if (!form.question || form.options.some((o) => !o)) { setMessage("题目和所有选项均为必填"); return; }
    setSaving(true); setMessage("");
    if (isNew) await fetch("/api/quiz-questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    else if (editingId) await fetch(`/api/quiz-questions/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setEditingId(null); setIsNew(false); setSaving(false); setMessage("保存成功！"); fetchQ();
  };
  const handleDelete = async (id: string) => { if (!confirm("确定删除？")) return; await fetch(`/api/quiz-questions/${id}`, { method: "DELETE" }); fetchQ(); };

  return (
    <AppLayout>
      <AdminNav />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8"><div><h1 className="text-3xl font-bold text-[#1A2332] mb-2 font-serif">测验管理</h1><p className="text-[#6B7F96]">管理知识测验题库（共 {questions.length} 题）</p></div><button onClick={handleNew} className="btn-secondary">+ 添加题目</button></div>
        {(isNew || editingId) && (
          <div className="card mb-8 border border-[#1B4F8A]/30">
            <h2 className="text-xl font-semibold text-[#1A2332] mb-4">{isNew ? "添加题目" : "编辑题目"}</h2>
            {message && <div className={`text-sm p-3 rounded-lg mb-4 ${message.includes("成功") ? "bg-[#E8F4F0] text-[#0F6E56] border border-[#0F6E56]/20" : "bg-[#FDE8E8] text-[#9B2C2C] border border-[#9B2C2C]/20"}`}>{message}</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-[#3D5166] mb-1">分类</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>{cats.map((c)=><option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-[#3D5166] mb-1">正确答案</label><select value={form.correct} onChange={(e) => setForm({ ...form, correct: parseInt(e.target.value) })} className={inputClass}>{[0,1,2,3].map((i)=><option key={i} value={i}>选项 {String.fromCharCode(65+i)}</option>)}</select></div>
              </div>
              <div><label className="block text-sm font-medium text-[#3D5166] mb-1">题目 <span className="text-[#9B2C2C]">*</span></label><textarea value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} rows={2} className={`${inputClass} resize-none`} /></div>
              <div><label className="block text-sm font-medium text-[#3D5166] mb-1">选项</label>
                {form.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded ${i===form.correct?"bg-[#E8F4F0] text-[#0F6E56]":"bg-[#F5F8FC] text-[#6B7F96]"}`}>{String.fromCharCode(65+i)}</span>
                    <input value={opt} onChange={(e)=>{const o=[...form.options];o[i]=e.target.value;setForm({...form,options:o});}} className={`flex-1 px-3 py-1.5 ${inputClass}`} placeholder={`选项 ${String.fromCharCode(65+i)}`} />
                  </div>
                ))}
              </div>
              <div><label className="block text-sm font-medium text-[#3D5166] mb-1">解析</label><textarea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} rows={2} className={`${inputClass} resize-none`} /></div>
              <div className="flex gap-3"><button onClick={handleSave} disabled={saving} className="btn-primary">{saving?"保存中...":"保存"}</button><button onClick={()=>{setEditingId(null);setIsNew(false);setMessage("");}} className="btn-secondary">取消</button></div>
            </div>
          </div>
        )}
        {loading ? <div className="text-center py-20 text-[#6B7F96]">加载题库...</div> : questions.length===0 ? <div className="text-center py-20 text-[#6B7F96]">还没有题目</div> : (
          <div className="space-y-3">{questions.map((q,idx)=>(
            <div key={q.id} className="card py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><span className="text-xs px-2 py-0.5 rounded-full bg-[#EBF2FA] text-[#1B4F8A]">{q.category}</span><span className="text-[#1A2332] font-medium">#{idx+1} {q.question}</span></div><div className="text-xs text-[#8FA0B4]">正确：{String.fromCharCode(65+q.correct)} | {q.explanation?.slice(0,50)}...</div></div>
                <div className="flex gap-2"><button onClick={()=>handleEdit(q)} className="text-xs px-3 py-1 border border-[#1B4F8A]/50 rounded text-[#1B4F8A] hover:bg-[#EBF2FA]">编辑</button><button onClick={()=>handleDelete(q.id)} className="text-xs px-3 py-1 border border-[#9B2C2C]/50 rounded text-[#9B2C2C] hover:bg-[#FDE8E8]">删除</button></div>
              </div>
            </div>
          ))}</div>
        )}
      </div>
    </AppLayout>
  );
}
