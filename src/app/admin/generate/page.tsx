"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";

export default function AdminGeneratePage() {
  const [category, setCategory] = useState("SVT");
  const [difficulty, setDifficulty] = useState("基础");
  const [count, setCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [saving, setSaving] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true); setResult("");
    try {
      const res = await fetch("/api/generate-case", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, difficulty, count }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      setResult(JSON.stringify(data.cases, null, 2));
    } catch (err: unknown) { setResult("生成失败：" + (err as Error).message); }
    finally { setGenerating(false); }
  };

  const handleSave = async () => {
    if (!result) return; setSaving(true);
    try {
      const cases = JSON.parse(result);
      if (Array.isArray(cases)) {
        for (const c of cases) await fetch("/api/cases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...c, category, difficulty, is_published: false }) });
        setResult(""); alert(`成功保存 ${cases.length} 个病例！`);
      }
    } catch { alert("保存失败"); }
    finally { setSaving(false); }
  };

  const selClass = "w-full px-3 py-2 bg-white border border-[#C5D3E0] rounded text-[#1A2332] text-sm focus:outline-none focus:border-[#1B4F8A]";

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-[#1A2332] mb-2 font-serif">AI 生成案例</h1>
        <p className="text-[#6B7F96] mb-8">使用 DeepSeek AI 批量生成电生理教学案例</p>
        <div className="card mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div><label className="block text-sm font-medium text-[#3D5166] mb-1">分类</label><select value={category} onChange={(e) => setCategory(e.target.value)} className={selClass}>{["SVT","VT","AF","AFL"].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-[#3D5166] mb-1">难度</label><select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={selClass}>{["基础","进阶","高级"].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-[#3D5166] mb-1">生成数量</label><input type="number" min={1} max={5} value={count} onChange={(e) => setCount(parseInt(e.target.value)||1)} className={selClass} /></div>
            <div className="flex items-end"><button onClick={handleGenerate} disabled={generating} className="btn-primary w-full disabled:opacity-50">{generating?"生成中...":"AI 生成"}</button></div>
          </div>
          {result && (
            <div>
              <div className="bg-[#F5F8FC] border border-[#DDE5EE] rounded-lg p-4 mb-4"><pre className="text-sm text-[#3D5166] whitespace-pre-wrap font-mono">{result}</pre></div>
              <button onClick={handleSave} disabled={saving||result.startsWith("生成失败")} className="btn-secondary disabled:opacity-50">{saving?"保存中...":"保存到数据库"}</button>
            </div>
          )}
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-[#1A2332] mb-2 font-serif">说明</h3>
          <ul className="text-sm text-[#6B7F96] space-y-1 list-disc list-inside">
            <li>AI 生成的案例需经人工审核确认医学准确性</li><li>生成后的案例默认为「未发布」状态</li><li>每次最多生成 5 个案例</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}
