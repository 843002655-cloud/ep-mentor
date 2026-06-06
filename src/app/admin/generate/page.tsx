"use client";

import { useState, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { chatService, caseService } from "@/lib/services";

type Tab = "generate" | "pdf";
const selClass = "w-full px-3 py-2 bg-white border border-[#C5D3E0] rounded text-[#1A2332] text-sm focus:outline-none focus:border-[#1B4F8A]";

export default function AdminGeneratePage() {
  const [tab, setTab] = useState<Tab>("generate");
  // AI generate state
  const [category, setCategory] = useState("SVT");
  const [difficulty, setDifficulty] = useState("基础");
  const [count, setCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [saving, setSaving] = useState(false);
  // PDF upload state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfResult, setPdfResult] = useState("");
  const [pdfSaving, setPdfSaving] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    setGenerating(true); setResult("");
    try { const cases = await chatService.generateCase(category, difficulty, count); setResult(JSON.stringify(cases, null, 2)); }
    catch (err: unknown) { setResult("生成失败：" + (err as Error).message); }
    finally { setGenerating(false); }
  };
  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const cases = JSON.parse(result);
      if (Array.isArray(cases)) {
        for (const c of cases) {
          await caseService.createCase({ ...c, category, difficulty, is_published: false } as Parameters<typeof caseService.createCase>[0]);
        }
      }
      setResult("");
      alert(`成功保存 ${cases.length} 个病例！`);
    } catch { alert("保存失败"); }
    finally { setSaving(false); }
  };

  const handlePdfUpload = async () => {
    if (!pdfFile) return; setPdfUploading(true); setPdfError(""); setPdfResult("");
    try {
      const form = new FormData(); form.append("file", pdfFile);
      const res = await fetch("/api/upload-pdf", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "解析失败");
      setPdfResult(JSON.stringify(data.case, null, 2));
    } catch (err: unknown) { setPdfError((err as Error).message); }
    finally { setPdfUploading(false); }
  };
  const handlePdfSave = async () => {
    if (!pdfResult) return;
    setPdfSaving(true);
    try {
      const c = JSON.parse(pdfResult);
      await caseService.createCase({ ...c, is_published: false } as Parameters<typeof caseService.createCase>[0]);
      setPdfResult(""); setPdfFile(null);
      if (fileRef.current) fileRef.current.value = "";
      alert("病例已保存到数据库！");
    } catch { alert("保存失败"); }
    finally { setPdfSaving(false); }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-[#1A2332] mb-2 font-serif">AI 生成案例</h1>
        <p className="text-[#6B7F96] mb-6">使用 DeepSeek AI 生成教学案例，或从 PDF 文献中提取</p>

        <div className="flex gap-2 mb-6">
          {[{ k: "generate", l: "🤖 AI 生成" }, { k: "pdf", l: "📄 PDF 导入" }].map((t) => (
            <button key={t.k} onClick={() => setTab(t.k as Tab)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.k ? "bg-[#1B4F8A] text-white" : "bg-white text-[#4B6080] border border-[#C5D3E0] hover:border-[#1B4F8A]"}`}>{t.l}</button>
          ))}
        </div>

        {tab === "generate" && (<>
          <div className="card mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div><label className="block text-sm font-medium text-[#3D5166] mb-1">分类</label><select value={category} onChange={(e) => setCategory(e.target.value)} className={selClass}>{["SVT","VT","AF","AFL"].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-[#3D5166] mb-1">难度</label><select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={selClass}>{["基础","进阶","高级"].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-[#3D5166] mb-1">生成数量</label><input type="number" min={1} max={5} value={count} onChange={(e) => setCount(parseInt(e.target.value)||1)} className={selClass} /></div>
              <div className="flex items-end"><button onClick={handleGenerate} disabled={generating} className="btn-primary w-full disabled:opacity-50">{generating?"生成中...":"AI 生成"}</button></div>
            </div>
            {result && (<div>
              <div className="bg-[#F5F8FC] border border-[#DDE5EE] rounded-lg p-4 mb-4"><pre className="text-sm text-[#3D5166] whitespace-pre-wrap font-mono">{result}</pre></div>
              <button onClick={handleSave} disabled={saving||result.startsWith("生成失败")} className="btn-secondary disabled:opacity-50">{saving?"保存中...":"保存到数据库"}</button>
            </div>)}
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold text-[#1A2332] mb-2 font-serif">说明</h3>
            <ul className="text-sm text-[#6B7F96] space-y-1 list-disc list-inside"><li>AI 生成的案例需经人工审核确认医学准确性</li><li>生成后的案例默认为「未发布」状态</li><li>每次最多生成 5 个案例</li></ul>
          </div>
        </>)}

        {tab === "pdf" && (
          <div className="card mb-8">
            <h2 className="text-lg font-semibold text-[#1A2332] mb-4 font-serif">📄 从 PDF 文献提取病例</h2>
            <p className="text-sm text-[#6B7F96] mb-4">上传电生理相关的 PDF 文献（病例报告、综述、指南），AI 将自动提取并生成结构化教学案例。</p>
            <div className="border-2 border-dashed border-[#C5D3E0] rounded-lg p-8 text-center mb-4 hover:border-[#1B4F8A] transition-colors">
              <input ref={fileRef} type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} className="hidden" id="pdf-upload" />
              <label htmlFor="pdf-upload" className="cursor-pointer">
                <div className="text-3xl mb-2">📎</div>
                <p className="text-sm text-[#1A2332] font-medium mb-1">{pdfFile ? pdfFile.name : "点击选择 PDF 文件"}</p>
                <p className="text-xs text-[#8FA0B4]">支持中英文文献，最大 10MB · 不含扫描件 OCR</p>
              </label>
            </div>
            <button onClick={handlePdfUpload} disabled={pdfUploading || !pdfFile} className="btn-primary w-full disabled:opacity-50 mb-4">{pdfUploading ? "AI 分析中..." : "开始提取"}</button>
            {pdfError && <div className="bg-[#FDE8E8] text-[#9B2C2C] text-sm p-3 rounded-lg mb-4">{pdfError}</div>}
            {pdfResult && (<div>
              <div className="bg-[#F5F8FC] border border-[#DDE5EE] rounded-lg p-4 mb-4"><pre className="text-sm text-[#3D5166] whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">{pdfResult}</pre></div>
              <button onClick={handlePdfSave} disabled={pdfSaving} className="btn-secondary disabled:opacity-50">{pdfSaving ? "保存中..." : "保存到数据库"}</button>
            </div>)}
            <div className="mt-6 p-4 bg-[#FEF3E2] border border-[#F5D8A8] rounded-lg">
              <p className="text-sm text-[#854F0B] font-medium mb-1">⚠️ 注意事项</p>
              <ul className="text-xs text-[#854F0B] space-y-1 list-disc list-inside"><li>仅支持文字型 PDF（非扫描图片），扫描件暂不支持</li><li>AI 提取结果仅供参考，请人工核对医学准确性</li><li>提取的病例默认为「未发布」状态</li></ul>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
