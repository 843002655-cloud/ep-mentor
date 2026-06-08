"use client";

import { useState, useRef, useCallback, type DragEvent } from "react";
import AppLayout from "@/components/AppLayout";
import { chatService, caseService } from "@/lib/services";

type Tab = "generate" | "pdf" | "images";
const selClass = "w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#C5D3E0] dark:border-slate-600 rounded text-sm text-[#1A2332] dark:text-slate-100 focus:outline-none focus:border-[#1B4F8A] dark:focus:border-blue-400";

const flattenCase = (c: Record<string, unknown>, extra?: Record<string, unknown>) => ({
  title: (c.title as string) || "未命名",
  category: (c.category as string) || "SVT",
  difficulty: (c.difficulty as string) || "基础",
  description: (c.description as string) || "",
  ecg_findings: ((c.ecg_findings as Record<string,unknown>)?.details as string[]) || (c.ecg_findings as string[]) || [],
  question: (c.question as string) || "",
  hint: (c.hint as string) || "",
  key_points: (c.key_points as string[]) || [],
  is_published: false,
  mapping_system: (c.mapping_system as string) || "",
  content_json: { ...c, ...extra } as Record<string, unknown>,
});

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

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A2332] dark:text-slate-100 mb-2 font-serif">AI 生成案例</h1>
        <p className="text-sm text-[#6B7F96] dark:text-slate-400 mb-4">通过 AI 自动生成电生理教学病例</p>
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {[{k:"generate",l:"🤖 AI生成"},{k:"pdf",l:"📄 PDF导入"},{k:"images",l:"📷 图片+文字"}].map(t=>(
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

        <div className="card"><h3 className="font-semibold text-[#1A2332] dark:text-slate-100 mb-2 text-sm">说明</h3><ul className="text-sm text-[#6B7F96] dark:text-slate-400 space-y-1 list-disc list-inside"><li>生成的案例默认「未发布」，在病例管理中编辑发布</li><li>PDF 通过 PDF.js 在浏览器端提取文字，不消耗服务器资源</li><li>支持拖拽上传 PDF 或图片文件</li></ul></div>
      </div>
    </AppLayout>
  );
}
