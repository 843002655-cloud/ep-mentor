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
  const flattenCase = (c: Record<string, unknown>) => {
    const ecg = c.ecg_findings as Record<string, unknown> | undefined;
    return {
      title: (c.title as string) || "未命名",
      category: (c.category as string) || category,
      difficulty: (c.difficulty as string) || difficulty,
      description: (c.description as string) || (c.patient as Record<string, string>)?.history || "",
      ecg_findings: (ecg?.details as string[]) || (c.ecg_findings as string[]) || [],
      question: (c.question as string) || "",
      hint: (c.hint as string) || "",
      key_points: (c.key_points as string[]) || [],
      is_published: false,
      mapping_system: (c.mapping_system as string) || "",
    };
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const parsed = JSON.parse(result);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      for (const c of list) {
        await caseService.createCase(flattenCase(c as Record<string, unknown>) as never);
      }
      setResult("");
      alert(`成功保存 ${list.length} 个病例！`);
    } catch (e) { alert("保存失败：" + ((e as Error).message || String(e))); }
    finally { setSaving(false); }
  };

  const handlePdfUpload = async () => {
    if (!pdfFile) return; setPdfUploading(true); setPdfError(""); setPdfResult("");
    try {
      // Step 1: Parse PDF in browser using PDF.js (CDN)
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfjsLib = (window as unknown as Record<string, { getDocument: (d: { data: Uint8Array }) => { promise: Promise<{ numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: { str: string }[] }>; render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => Promise<void>; getViewport: (opts: { scale: number }) => { width: number; height: number } }> }> } }>).pdfjsLib;
      if (!pdfjsLib) throw new Error("PDF.js 未加载，请刷新页面重试");

      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      let text = "";
      const imageUrls: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        // Extract text
        const content = await page.getTextContent();
        text += content.items.map((item) => item.str).join(" ") + "\n";

        // Render page to image (first 10 pages max)
        if (i <= 10) {
          try {
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              await page.render({ canvasContext: ctx, viewport });
              const blob = await new Promise<Blob>((resolve) =>
                canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.8)
              );
              // Upload to Supabase Storage
              const supabase = (await import("@/lib/supabase")).getSupabase();
              const fileName = `pdf-${Date.now()}-p${i}.jpg`;
              const { error: uploadErr } = await supabase.storage
                .from("case-images")
                .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });
              if (uploadErr) {
                console.warn("Image upload failed:", uploadErr.message);
              } else {
                const { data: urlData } = supabase.storage
                  .from("case-images")
                  .getPublicUrl(fileName);
                if (urlData?.publicUrl) imageUrls.push(urlData.publicUrl);
              }
            }
          } catch(e) { console.warn("Page render failed:", e); }
        }
      }

      if (!text.trim()) throw new Error("PDF 无可提取文字（可能为扫描件）");

      // Step 2: Send text + image URLs to server for AI extraction
      const res = await fetch("/api/upload-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 10000), imageUrls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提取失败");
      // Include image info
      const resultCase = { ...data.case };
      if (imageUrls.length > 0) {
        // Inject image URLs into ecg_findings.figures if not already present
        if (!resultCase.ecg_findings?.figures?.length) {
          resultCase.image_urls = imageUrls;
        }
      }
      setPdfResult(JSON.stringify(resultCase, null, 2));
      if (imageUrls.length > 0) {
        setPdfError(`✅ 成功提取 ${imageUrls.length} 张图片`);
      } else {
        setPdfError("⚠️ 图片上传失败（请确保 Supabase Storage bucket 已创建并设为 Public，且已执行允许公开上传的 SQL）");
      }
    } catch (err: unknown) { setPdfError((err as Error).message); }
    finally { setPdfUploading(false); }
  };
  const handlePdfSave = async () => {
    if (!pdfResult) return;
    setPdfSaving(true);
    try {
      const c = JSON.parse(pdfResult) as Record<string, unknown>;
      const flat = flattenCase(c);
      console.log("Saving case:", JSON.stringify(flat, null, 2));
      await caseService.createCase(flat as never);
      setPdfResult(""); setPdfFile(null);
      if (fileRef.current) fileRef.current.value = "";
      alert("病例已保存！去 /admin/cases 编辑发布");
    } catch (e) {
      console.error("Save error:", e);
      const msg = e instanceof Error ? e.message : String(e);
      alert("保存失败：" + msg);
    }
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
