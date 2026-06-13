"use client";

import { useState, useRef, useCallback, type DragEvent } from "react";
import AppLayout from "@/components/AppLayout";
import { chatService, caseService } from "@/lib/services";
import { flattenCase } from "@/lib/case-utils";

type Tab = "generate" | "pdf" | "images" | "book";
const selClass = "w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#C5D3E0] dark:border-slate-600 rounded text-sm text-[#1A2332] dark:text-slate-100 focus:outline-none focus:border-[#1B4F8A] dark:focus:border-blue-400";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

/** Drag-and-drop upload zone */
function DropZone({
  accept,
  multiple,
  label,
  icon,
  fileInfo,
  onFiles,
}: {
  accept: string;
  multiple?: boolean;
  label: string;
  icon: string;
  fileInfo: string;
  onFiles: (files: File[]) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f =>
      accept.split(",").some(ext => f.name.toLowerCase().endsWith(ext.trim().replace(".","")) || f.type.startsWith(ext.trim().replace(".","").replace("*","")))
    );
    if (files.length > 0) onFiles(files);
  }, [accept, onFiles]);

  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = (e: DragEvent) => { e.preventDefault(); setDragging(false); };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-6 text-center mb-3 cursor-pointer transition-all duration-200 ${
        dragging
          ? "border-[#1B4F8A] dark:border-blue-400 bg-[#EBF2FA] dark:bg-blue-900/20 scale-[1.02]"
          : fileInfo
            ? "border-[#0F6E56] dark:border-emerald-500 bg-[#E8F4F0] dark:bg-emerald-900/20"
            : "border-[#C5D3E0] dark:border-slate-600 hover:border-[#1B4F8A] dark:hover:border-blue-400"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={e => { const files = Array.from(e.target.files || []); if (files.length > 0) onFiles(files); }}
        className="hidden"
      />
      <div className="text-3xl mb-2">{dragging ? "📥" : icon}</div>
      <p className="text-sm font-medium text-[#3D5166] dark:text-slate-300">
        {dragging ? "松开以上传" : fileInfo || label}
      </p>
      <p className="text-xs text-[#8FA0B4] dark:text-slate-500 mt-1">拖拽文件到此处或点击选择</p>
    </div>
  );
}

/** Progress steps indicator */
function ProgressSteps({ step, steps }: { step: number; steps: string[] }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300 ${
            i < step ? "bg-[#0F6E56] text-white"
            : i === step ? "bg-[#1B4F8A] dark:bg-blue-600 text-white animate-pulse"
            : "bg-[#E8ECF0] dark:bg-slate-700 text-[#8FA0B4] dark:text-slate-500"
          }`}>
            {i < step ? "✓" : i + 1}
          </div>
          <span className={`text-xs ${i <= step ? "text-[#3D5166] dark:text-slate-300 font-medium" : "text-[#8FA0B4] dark:text-slate-500"}`}>{s}</span>
          {i < steps.length - 1 && <div className={`w-4 h-px ${i < step ? "bg-[#0F6E56]" : "bg-[#E8ECF0] dark:bg-slate-700"}`} />}
        </div>
      ))}
    </div>
  );
}

export default function AdminGeneratePage() {
  const [tab, setTab] = useState<Tab>("generate");
  // AI generate
  const [cat, setCat] = useState("SVT"); const [diff, setDiff] = useState("基础"); const [cnt, setCnt] = useState(1);
  const [genning, setGenning] = useState(false); const [result, setResult] = useState(""); const [saving, setSaving] = useState(false);
  // PDF
  const [pdfFile, setPdfFile] = useState<File|null>(null); const [pdfUp, setPdfUp] = useState(false);
  const [pdfResult, setPdfResult] = useState(""); const [pdfSaving, setPdfSaving] = useState(false);
  const [pdfErr, setPdfErr] = useState(""); const [pdfStep, setPdfStep] = useState(0); // 0=idle, 1=extracting, 2=analyzing
  // Images
  const [imgFiles, setImgFiles] = useState<File[]>([]);
  const [imgText, setImgText] = useState(""); const [imgUp, setImgUp] = useState(false);
  const [imgResult, setImgResult] = useState(""); const [imgSaving, setImgSaving] = useState(false);
  const [imgErr, setImgErr] = useState(""); const [imgStep, setImgStep] = useState(0);
  // Book (PDF case book → multiple cases)
  const [bookFile, setBookFile] = useState<File|null>(null);
  const [bookSplitting, setBookSplitting] = useState(false);
  const [bookErr, setBookErr] = useState("");
  interface BookCase {
    index: number; title: string; text_chunk: string;
    figure_count: number; char_count: number;
    status: "pending"|"generating"|"done"|"failed"|"saving"|"saved";
    generated: Record<string,unknown>|null; error: string;
  }
  const [bookCases, setBookCases] = useState<BookCase[]>([]);
  const [bookGenerating, setBookGenerating] = useState(false);

  // ── AI Generate ──────────────────────────────────────────
  const doGenerate = async () => { setGenning(true); setResult(""); try { setResult(JSON.stringify(await chatService.generateCase(cat, diff, cnt), null, 2)); } catch(e) { setResult("失败："+(e as Error).message); } finally { setGenning(false); } };
  const doSave = async () => { if(!result)return; setSaving(true); try { const list=JSON.parse(result); const arr=Array.isArray(list)?list:[list]; for(const c of arr) await caseService.createCase(flattenCase(c as Record<string,unknown>) as never); setResult(""); alert(`保存 ${arr.length} 个`); } catch { alert("保存失败"); } finally { setSaving(false); } };

  // ── PDF ──────────────────────────────────────────────────
  const doPdf = async () => { if(!pdfFile)return; setPdfUp(true); setPdfErr(""); setPdfResult(""); setPdfStep(1);
    try {
      const buf = await pdfFile.arrayBuffer();
      const w = window as unknown as Record<string, Record<string, unknown>>;
      const pdfjsLib = w.pdfjsLib as { getDocument: (d: { data: Uint8Array }) => { promise: Promise<{ numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: { str: string }[] }> }> }> } } | undefined;
      if(!pdfjsLib) throw new Error("PDF.js 未加载");
      const pdf = await pdfjsLib.getDocument({data:new Uint8Array(buf)}).promise;
      let text="";
      for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i);text+=(await p.getTextContent()).items.map((x)=>x.str).join(" ")+"\n";}
      if(!text.trim()) throw new Error("无文字");
      setPdfStep(2);
      const res=await fetch("/api/upload-pdf",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:text.slice(0,8000),imageUrls:[]})});
      const d=await res.json(); if(!res.ok) throw new Error(d.error||"提取失败");
      setPdfResult(JSON.stringify({...d.case,image_urls:[]},null,2));
      setPdfStep(0);
    } catch(e) { setPdfStep(0); setPdfErr((e as Error).message); } finally { setPdfUp(false); } };
  const doPdfSave = async () => { if(!pdfResult)return; setPdfSaving(true); try { const c=JSON.parse(pdfResult); await caseService.createCase(flattenCase(c as Record<string,unknown>) as never); setPdfResult("");alert("已保存"); } catch { alert("保存失败"); } finally { setPdfSaving(false); } };

  // ── Images ───────────────────────────────────────────────
  const doImageUpload = async () => {
    if(imgFiles.length===0)return; setImgUp(true); setImgErr(""); setImgResult(""); setImgStep(1);
    const urls:string[]=[];
    try {
      // Upload each image
      for(let i=0;i<imgFiles.length;i++) {
        const f = imgFiles[i];
        const fd=new FormData(); fd.append("file",f);
        const r=await fetch("/api/upload-image",{method:"POST",body:fd});
        if(r.ok){ const d=await r.json(); if(d.url) urls.push(d.url); }
      }
      if(urls.length===0) throw new Error("所有图片上传失败");
      setImgStep(2);
      // Generate case from images + text
      const res=await fetch("/api/upload-pdf",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:imgText||"请根据图片内容生成电生理教学案例",imageUrls:urls})});
      const d=await res.json(); if(!res.ok) throw new Error(d.error||"生成失败");
      setImgResult(JSON.stringify({...d.case,image_urls:urls},null,2));
      setImgStep(0); setImgErr(`✅ ${urls.length} 张图片已处理`);
    } catch(e) { setImgStep(0); setImgErr((e as Error).message); } finally { setImgUp(false); }
  };
  const doImgSave = async () => { if(!imgResult)return; setImgSaving(true); try { const c=JSON.parse(imgResult); await caseService.createCase(flattenCase(c as Record<string,unknown>) as never); setImgResult(""); alert("已保存"); } catch { alert("保存失败"); } finally { setImgSaving(false); } };

  // ── Book (PDF case book → multiple cases) ──────────────────
  const doBookExtract = async () => {
    if(!bookFile)return; setBookSplitting(true); setBookErr(""); setBookCases([]);
    try {
      const buf = await bookFile.arrayBuffer();
      const w = window as unknown as Record<string, Record<string, unknown>>;
      const pdfjsLib = w.pdfjsLib as { getDocument: (d: { data: Uint8Array }) => { promise: Promise<{ numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: { str: string }[] }> }> }> } } | undefined;
      if(!pdfjsLib) throw new Error("PDF.js 未加载");
      const pdf = await pdfjsLib.getDocument({data:new Uint8Array(buf)}).promise;
      let text="";
      for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i);text+=(await p.getTextContent()).items.map((x)=>x.str).join(" ")+"\n";}
      if(!text.trim()) throw new Error("无文字");
      // Call split API
      const res=await fetch("/api/split-pdf-cases",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text})});
      const d=await res.json(); if(!res.ok) throw new Error(d.error||"拆分失败");
      const cases: BookCase[] = (d.cases as BookCase[]).map((c) => ({...c,status:"pending" as const,generated:null,error:""}));
      setBookCases(cases);
    } catch(e) { setBookErr((e as Error).message); } finally { setBookSplitting(false); }
  };

  const doBookGenerateOne = async (index: number) => {
    setBookCases(prev => prev.map(c => c.index===index?{...c,status:"generating" as const,error:""}:c));
    try {
      const bc = bookCases.find(c=>c.index===index);
      if(!bc) return;
      const res=await fetch("/api/generate-book-case",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:bc.text_chunk,case_index:bc.index,case_title:bc.title})});
      const d=await res.json(); if(!res.ok) throw new Error(d.error||"生成失败");
      setBookCases(prev => prev.map(c => c.index===index?{...c,status:"done" as const,generated:d.case,error:""}:c));
    } catch(e) { setBookCases(prev => prev.map(c => c.index===index?{...c,status:"failed" as const,error:(e as Error).message}:c)); }
  };

  const doBookGenerateAll = async () => {
    setBookGenerating(true);
    const pending = bookCases.filter(c=>c.status==="pending"||c.status==="failed");
    // Generate sequentially to avoid rate limiting
    for(const bc of pending) {
      await doBookGenerateOne(bc.index);
    }
    setBookGenerating(false);
  };

  const doBookSaveOne = async (index: number) => {
    setBookCases(prev => prev.map(c => c.index===index?{...c,status:"saving" as const}:c));
    try {
      const bc = bookCases.find(c=>c.index===index);
      if(!bc?.generated) return;
      await caseService.createCase(flattenCase(bc.generated as Record<string,unknown>, {source_book: bc.title}) as never);
      setBookCases(prev => prev.map(c => c.index===index?{...c,status:"saved" as const}:c));
    } catch(e) { alert("保存失败："+(e as Error).message);
      setBookCases(prev => prev.map(c => c.index===index?{...c,status:"done" as const}:c)); }
  };

  const doBookSaveAll = async () => {
    const done = bookCases.filter(c=>c.status==="done");
    if(done.length===0){alert("没有可保存的病例");return;}
    for(const bc of done) {
      await doBookSaveOne(bc.index);
    }
    alert(`已保存 ${done.length} 个病例`);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A2332] dark:text-slate-100 mb-2 font-serif">AI 生成案例</h1>
        <p className="text-sm text-[#6B7F96] dark:text-slate-400 mb-4">通过 AI 自动生成电生理教学病例</p>
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {[{k:"generate",l:"🤖 AI生成"},{k:"pdf",l:"📄 PDF导入"},{k:"images",l:"📷 图片+文字"},{k:"book",l:"📚 病例书"}].map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k as Tab)} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${tab===t.k?"bg-[#1B4F8A] dark:bg-blue-600 text-white":"bg-white dark:bg-slate-800 border border-[#C5D3E0] dark:border-slate-600 text-[#4B6080] dark:text-slate-300"}`}>{t.l}</button>
          ))}
        </div>

        {tab==="generate"&&(<div className="card mb-6">
          <h3 className="font-semibold text-[#1A2332] dark:text-slate-100 mb-3 text-sm sm:text-base">🤖 AI 智能生成病例</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div><label className="block text-xs text-[#3D5166] dark:text-slate-300 mb-1">分类</label><select value={cat} onChange={e=>setCat(e.target.value)} className={selClass}>{["SVT","VT","AF","AFL"].map(o=><option key={o}>{o}</option>)}</select></div>
            <div><label className="block text-xs text-[#3D5166] dark:text-slate-300 mb-1">难度</label><select value={diff} onChange={e=>setDiff(e.target.value)} className={selClass}>{["基础","进阶","高级"].map(o=><option key={o}>{o}</option>)}</select></div>
            <div><label className="block text-xs text-[#3D5166] dark:text-slate-300 mb-1">数量</label><input type="number" min={1} max={5} value={cnt} onChange={e=>setCnt(parseInt(e.target.value)||1)} className={selClass}/></div>
            <div className="flex items-end"><button onClick={doGenerate} disabled={genning} className="btn-primary w-full text-sm">{genning?"生成中...":"生成病例"}</button></div>
          </div>
          {result&&<div><pre className="bg-[#F5F8FC] dark:bg-slate-800 rounded-lg p-4 mb-3 text-sm overflow-auto max-h-96 border border-[#DDE5EE] dark:border-slate-700">{result}</pre><button onClick={doSave} disabled={saving||result.startsWith("失败")} className="btn-secondary">{saving?"保存中...":"保存到数据库"}</button></div>}
        </div>)}

        {tab==="pdf"&&(<div className="card mb-6">
          <h3 className="font-semibold text-[#1A2332] dark:text-slate-100 mb-3 text-sm sm:text-base">📄 PDF 文献导入</h3>
          <p className="text-xs text-[#6B7F96] dark:text-slate-400 mb-3">上传电生理文献 PDF，自动提取文字并由 AI 生成教学病例</p>
          <DropZone
            accept=".pdf"
            icon="📎"
            label="点击选择 PDF 文件"
            fileInfo={pdfFile ? `📄 ${pdfFile.name} (${formatFileSize(pdfFile.size)})` : ""}
            onFiles={(files) => { setPdfFile(files[0]); setPdfErr(""); setPdfResult(""); }}
          />
          {pdfUp && <ProgressSteps step={pdfStep} steps={["提取文字", "AI 分析生成"]} />}
          <button onClick={doPdf} disabled={pdfUp||!pdfFile} className="btn-primary w-full text-sm mb-3">
            {pdfUp ? (pdfStep === 1 ? "提取文字中..." : "AI 分析中...") : `开始提取${pdfFile ? `（${formatFileSize(pdfFile.size)}）` : ""}`}
          </button>
          {pdfErr&&<div className="flex items-start gap-2 text-sm p-3 rounded-lg mb-3 bg-[#FDE8E8] dark:bg-red-900/20 text-[#9B2C2C] dark:text-red-300"><span>⚠️</span><span>{pdfErr}</span></div>}
          {pdfResult&&<div>
            <div className="flex items-center gap-2 mb-2"><span className="text-sm text-[#0F6E56] dark:text-emerald-300 font-medium">✅ 生成成功</span><span className="text-xs text-[#8FA0B4]">{new Date().toLocaleTimeString("zh-CN")}</span></div>
            <pre className="bg-[#F5F8FC] dark:bg-slate-800 rounded-lg p-4 mb-3 text-sm overflow-auto max-h-96 border border-[#DDE5EE] dark:border-slate-700">{pdfResult}</pre>
            <button onClick={doPdfSave} disabled={pdfSaving} className="btn-secondary">{pdfSaving?"保存中...":"保存到数据库"}</button>
          </div>}
        </div>)}

        {tab==="images"&&(<div className="card mb-6">
          <h3 className="font-semibold text-[#1A2332] dark:text-slate-100 mb-3 text-sm sm:text-base">📷 图片 + 文字 → AI 生成</h3>
          <p className="text-xs text-[#6B7F96] dark:text-slate-400 mb-3">上传 PDF 截图 + 粘贴文献文字，AI 自动生成图文教学案例</p>
          <DropZone
            accept="image/*"
            multiple
            icon="🖼️"
            label="点击选择图片（可多选）"
            fileInfo={imgFiles.length > 0 ? `已选 ${imgFiles.length} 张图片 (${formatFileSize(imgFiles.reduce((s,f)=>s+f.size,0))})` : ""}
            onFiles={(files) => { setImgFiles(files); setImgErr(""); setImgResult(""); }}
          />
          <textarea value={imgText} onChange={e=>setImgText(e.target.value)} rows={3} placeholder="粘贴 PDF 中的病例文字内容（可选，帮助 AI 更准确分析）..." className={`${selClass} mb-3 resize-none`}/>
          {imgUp && <ProgressSteps step={imgStep} steps={[`上传 ${imgFiles.length} 张图片`, "AI 分析生成"]} />}
          <button onClick={doImageUpload} disabled={imgUp||imgFiles.length===0} className="btn-primary w-full text-sm mb-3">
            {imgUp ? (imgStep === 1 ? `上传图片中...` : "AI 分析中...") : `上传图片并生成案例${imgFiles.length > 0 ? `（${imgFiles.length} 张）` : ""}`}
          </button>
          {imgErr&&<div className={`flex items-start gap-2 text-sm p-3 rounded-lg mb-3 ${imgErr.startsWith("✅")?"bg-[#E8F4F0] dark:bg-emerald-900/20 text-[#0F6E56] dark:text-emerald-300":"bg-[#FDE8E8] dark:bg-red-900/20 text-[#9B2C2C] dark:text-red-300"}`}><span>{imgErr.startsWith("✅")?"✅":"⚠️"}</span><span>{imgErr}</span></div>}
          {imgResult&&<div>
            <div className="flex items-center gap-2 mb-2"><span className="text-sm text-[#0F6E56] dark:text-emerald-300 font-medium">✅ 生成成功</span><span className="text-xs text-[#8FA0B4]">{new Date().toLocaleTimeString("zh-CN")}</span></div>
            <pre className="bg-[#F5F8FC] dark:bg-slate-800 rounded-lg p-4 mb-3 text-sm overflow-auto max-h-96 border border-[#DDE5EE] dark:border-slate-700">{imgResult}</pre>
            <button onClick={doImgSave} disabled={imgSaving} className="btn-secondary">{imgSaving?"保存中...":"保存到数据库"}</button>
          </div>}
        </div>)}

        {tab==="book"&&<div className="card mb-6">
          <h3 className="font-semibold text-[#1A2332] dark:text-slate-100 mb-3 text-sm sm:text-base">📚 病例书批量导入</h3>
          <p className="text-xs text-[#6B7F96] dark:text-slate-400 mb-3">上传含多个病例的 PDF 病例书，自动拆分为独立病例并 AI 生成教学案例。每个病例标注原书出处。</p>
          <DropZone
            accept=".pdf"
            icon="📚"
            label="点击选择病例书 PDF"
            fileInfo={bookFile ? `📄 ${bookFile.name} (${formatFileSize(bookFile.size)})` : ""}
            onFiles={(files) => { setBookFile(files[0]); setBookErr(""); setBookCases([]); }}
          />
          <button onClick={doBookExtract} disabled={bookSplitting||!bookFile} className="btn-primary w-full text-sm mb-3">
            {bookSplitting ? "提取文字并拆分中..." : `提取文字并拆分为独立病例${bookFile ? `（${formatFileSize(bookFile.size)}）` : ""}`}
          </button>
          {bookErr&&<div className="flex items-start gap-2 text-sm p-3 rounded-lg mb-3 bg-[#FDE8E8] dark:bg-red-900/20 text-[#9B2C2C] dark:text-red-300"><span>⚠️</span><span>{bookErr}</span></div>}

          {bookCases.length>0&&<>
            <div className="flex flex-wrap items-center gap-2 mb-3 p-3 bg-[#F5F8FC] dark:bg-slate-800 rounded-lg border border-[#DDE5EE] dark:border-slate-700">
              <span className="text-sm font-medium text-[#1A2332] dark:text-slate-100">📋 {bookCases.length} 个病例已拆分</span>
              <span className="text-xs text-[#6B7F96] dark:text-slate-400">
                已生成: {bookCases.filter(c=>c.status==="done"||c.status==="saving"||c.status==="saved").length}/{bookCases.length}
              </span>
              <div className="flex-1"/>
              <button onClick={doBookGenerateAll} disabled={bookGenerating||bookCases.every(c=>c.status==="done"||c.status==="saved")} className="px-3 py-1 text-xs rounded-md bg-[#1B4F8A] dark:bg-blue-600 text-white hover:bg-[#154070] dark:hover:bg-blue-500 disabled:opacity-50 transition-colors">
                {bookGenerating ? "⏳ 生成中..." : "⚡ 全部生成"}
              </button>
              <button onClick={doBookSaveAll} disabled={bookCases.filter(c=>c.status==="done").length===0} className="px-3 py-1 text-xs rounded-md bg-[#0F6E56] dark:bg-emerald-600 text-white hover:bg-[#0B5A46] dark:hover:bg-emerald-500 disabled:opacity-50 transition-colors">
                💾 全部保存
              </button>
            </div>

            {bookGenerating&&<div className="mb-3">
              <div className="flex items-center justify-between mb-1"><span className="text-xs text-[#6B7F96]">生成进度</span><span className="text-xs font-medium text-[#1B4F8A]">{bookCases.filter(c=>c.status!=="pending"&&c.status!=="generating").length}/{bookCases.length}</span></div>
              <div className="w-full bg-[#E8ECF0] dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div className="bg-[#1B4F8A] dark:bg-blue-600 h-full rounded-full transition-all duration-300" style={{width:`${(bookCases.filter(c=>c.status!=="pending"&&c.status!=="generating").length/bookCases.length)*100}%`}}/>
              </div>
            </div>}

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {bookCases.map(bc=>{
                const statusColors: Record<string,string> = {
                  pending: "bg-[#E8ECF0] dark:bg-slate-700 text-[#6B7F96] dark:text-slate-400",
                  generating: "bg-[#EBF2FA] dark:bg-blue-900/20 text-[#1B4F8A] dark:text-blue-400",
                  done: "bg-[#E8F4F0] dark:bg-emerald-900/20 text-[#0F6E56] dark:text-emerald-400",
                  failed: "bg-[#FDE8E8] dark:bg-red-900/20 text-[#9B2C2C] dark:text-red-400",
                  saving: "bg-[#EBF2FA] dark:bg-blue-900/20 text-[#1B4F8A] dark:text-blue-400",
                  saved: "bg-[#E8F4F0] dark:bg-emerald-900/20 text-[#0F6E56] dark:text-emerald-400",
                };
                const statusLabels: Record<string,string> = {
                  pending:"待生成", generating:"生成中...", done:"已生成", failed:"失败", saving:"保存中...", saved:"已保存",
                };
                return (
                  <div key={bc.index} className={`p-3 rounded-lg border transition-colors ${
                    bc.status==="saved" ? "border-[#0F6E56]/30 dark:border-emerald-700/30 bg-[#E8F4F0]/30 dark:bg-emerald-900/10"
                    : bc.status==="failed" ? "border-[#9B2C2C]/30 dark:border-red-700/30 bg-[#FDE8E8]/30 dark:bg-red-900/10"
                    : "border-[#DDE5EE] dark:border-slate-700 bg-white dark:bg-slate-800"
                  }`}>
                    <div className="flex items-start gap-3">
                      <span className="text-lg font-bold text-[#1A2332] dark:text-slate-100 shrink-0 w-8">#{bc.index}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1A2332] dark:text-slate-100 truncate">{bc.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-[#8FA0B4]">🖼 {bc.figure_count} 图</span>
                          <span className="text-xs text-[#8FA0B4]">📝 {(bc.char_count/1000).toFixed(0)}K 字</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColors[bc.status]}`}>{statusLabels[bc.status]}</span>
                        </div>
                        {bc.error&&<p className="text-xs text-[#9B2C2C] dark:text-red-400 mt-1">{bc.error}</p>}
                        {bc.generated&&<div className="mt-2">
                          <details className="text-xs">
                            <summary className="cursor-pointer text-[#1B4F8A] dark:text-blue-400 hover:underline">查看生成结果</summary>
                            <pre className="mt-1 bg-[#F5F8FC] dark:bg-slate-900 rounded p-2 text-xs overflow-auto max-h-48 border border-[#DDE5EE] dark:border-slate-700">{JSON.stringify(bc.generated,null,2)}</pre>
                          </details>
                        </div>}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {(bc.status==="pending"||bc.status==="failed")&&<button onClick={()=>doBookGenerateOne(bc.index)} disabled={bookGenerating} className="px-2 py-1 text-xs rounded bg-[#1B4F8A] dark:bg-blue-600 text-white hover:bg-[#154070] disabled:opacity-50 transition-colors whitespace-nowrap">生成</button>}
                        {bc.status==="done"&&<button onClick={()=>doBookSaveOne(bc.index)} className="px-2 py-1 text-xs rounded bg-[#0F6E56] dark:bg-emerald-600 text-white hover:bg-[#0B5A46] transition-colors whitespace-nowrap">保存</button>}
                        {bc.status==="saved"&&<span className="text-xs text-[#0F6E56] dark:text-emerald-400">✅</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>}
        </div>}

        <div className="card"><h3 className="font-semibold text-[#1A2332] dark:text-slate-100 mb-2 text-sm">说明</h3><ul className="text-sm text-[#6B7F96] dark:text-slate-400 space-y-1 list-disc list-inside"><li>生成的案例默认「未发布」，在病例管理中编辑发布</li><li>PDF 通过 PDF.js 在浏览器端提取文字，不消耗服务器资源</li><li>支持拖拽上传 PDF 或图片文件</li><li>病例书导入：上传整本病例书 PDF，自动拆分为独立病例并逐个人工智能生成</li></ul></div>
      </div>
    </AppLayout>
  );
}
