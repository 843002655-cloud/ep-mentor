"use client";

import { useState } from "react";
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

export default function AdminGeneratePage() {
  const [tab, setTab] = useState<Tab>("generate");
  // AI generate
  const [cat, setCat] = useState("SVT"); const [diff, setDiff] = useState("基础"); const [cnt, setCnt] = useState(1);
  const [genning, setGenning] = useState(false); const [result, setResult] = useState(""); const [saving, setSaving] = useState(false);
  // PDF
  const [pdfFile, setPdfFile] = useState<File|null>(null); const [pdfUp, setPdfUp] = useState(false);
  const [pdfResult, setPdfResult] = useState(""); const [pdfSaving, setPdfSaving] = useState(false);
  const [pdfErr, setPdfErr] = useState("");
  // Images
  const [imgFiles, setImgFiles] = useState<File[]>([]);
  const [imgText, setImgText] = useState(""); const [imgUp, setImgUp] = useState(false);
  const [imgResult, setImgResult] = useState(""); const [imgSaving, setImgSaving] = useState(false);
  const [imgErr, setImgErr] = useState("");

  // ── AI Generate ──────────────────────────────────────────
  const doGenerate = async () => { setGenning(true); setResult(""); try { setResult(JSON.stringify(await chatService.generateCase(cat, diff, cnt), null, 2)); } catch(e) { setResult("失败："+(e as Error).message); } finally { setGenning(false); } };
  const doSave = async () => { if(!result)return; setSaving(true); try { const list=JSON.parse(result); const arr=Array.isArray(list)?list:[list]; for(const c of arr) await caseService.createCase(flattenCase(c as Record<string,unknown>) as never); setResult(""); alert(`保存 ${arr.length} 个`); } catch { alert("保存失败"); } finally { setSaving(false); } };

  // ── PDF ──────────────────────────────────────────────────
  const doPdf = async () => { if(!pdfFile)return; setPdfUp(true); setPdfErr(""); setPdfResult(""); try {
    const buf = await pdfFile.arrayBuffer();
    const w = window as unknown as Record<string, Record<string, unknown>>;
    const pdfjsLib = w.pdfjsLib as { getDocument: (d: { data: Uint8Array }) => { promise: Promise<{ numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: { str: string }[] }> }> }> } } | undefined;
    if(!pdfjsLib) throw new Error("PDF.js 未加载");
    const pdf = await pdfjsLib.getDocument({data:new Uint8Array(buf)}).promise;
    let text=""; const urls:string[]=[];
    for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i);text+=(await p.getTextContent()).items.map((x)=>x.str).join(" ")+"\n";}
    if(!text.trim()) throw new Error("无文字");
    const res=await fetch("/api/upload-pdf",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:text.slice(0,8000),imageUrls:[]})});
    const d=await res.json(); if(!res.ok) throw new Error(d.error||"提取失败");
    setPdfResult(JSON.stringify({...d.case,image_urls:urls},null,2));
    setPdfErr(urls.length>0?`${urls.length} 张图片`:"文字提取成功（图片需手动上传）");
  } catch(e) { setPdfErr((e as Error).message); } finally { setPdfUp(false); } };
  const doPdfSave = async () => { if(!pdfResult)return; setPdfSaving(true); try { const c=JSON.parse(pdfResult); await caseService.createCase(flattenCase(c as Record<string,unknown>) as never); setPdfResult("");alert("已保存"); } catch { alert("保存失败"); } finally { setPdfSaving(false); } };

  // ── Images ───────────────────────────────────────────────
  const doImageUpload = async () => {
    if(imgFiles.length===0)return; setImgUp(true); setImgErr(""); setImgResult("");
    const urls:string[]=[];
    try {
      // Upload each image
      for(const f of imgFiles) {
        const fd=new FormData(); fd.append("file",f);
        const r=await fetch("/api/upload-image",{method:"POST",body:fd});
        if(r.ok){ const d=await r.json(); if(d.url) urls.push(d.url); }
        else { const t=await r.text(); console.warn("Upload fail:",t); }
      }
      if(urls.length===0) throw new Error("所有图片上传失败");
      // Generate case from images + text
      const res=await fetch("/api/upload-pdf",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:imgText||"请根据图片内容生成电生理教学案例",imageUrls:urls})});
      const d=await res.json(); if(!res.ok) throw new Error(d.error||"生成失败");
      setImgResult(JSON.stringify({...d.case,image_urls:urls},null,2));
      setImgErr(`✅ ${urls.length} 张图片已处理`);
    } catch(e) { setImgErr((e as Error).message); } finally { setImgUp(false); }
  };
  const doImgSave = async () => { if(!imgResult)return; setImgSaving(true); try { const c=JSON.parse(imgResult); await caseService.createCase(flattenCase(c as Record<string,unknown>) as never); setImgResult(""); alert("已保存"); } catch { alert("保存失败"); } finally { setImgSaving(false); } };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-[#1A2332] mb-2 font-serif">AI 生成案例</h1>
        <div className="flex gap-2 mb-6">
          {[{k:"generate",l:"🤖 AI生成"},{k:"pdf",l:"📄 PDF导入"},{k:"images",l:"📷 图片+文字"}].map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k as Tab)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab===t.k?"bg-[#1B4F8A] text-white":"bg-white border border-[#C5D3E0] text-[#4B6080]"}`}>{t.l}</button>
          ))}
        </div>

        {tab==="generate"&&(<div className="card mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div><label className="block text-xs text-[#3D5166] mb-1">分类</label><select value={cat} onChange={e=>setCat(e.target.value)} className={selClass}>{["SVT","VT","AF","AFL"].map(o=><option key={o}>{o}</option>)}</select></div>
            <div><label className="block text-xs text-[#3D5166] mb-1">难度</label><select value={diff} onChange={e=>setDiff(e.target.value)} className={selClass}>{["基础","进阶","高级"].map(o=><option key={o}>{o}</option>)}</select></div>
            <div><label className="block text-xs text-[#3D5166] mb-1">数量</label><input type="number" min={1} max={5} value={cnt} onChange={e=>setCnt(parseInt(e.target.value)||1)} className={selClass}/></div>
            <div className="flex items-end"><button onClick={doGenerate} disabled={genning} className="btn-primary w-full text-sm">{genning?"生成中":"生成"}</button></div>
          </div>
          {result&&<div><pre className="bg-[#F5F8FC] rounded-lg p-4 mb-3 text-sm overflow-auto max-h-96">{result}</pre><button onClick={doSave} disabled={saving||result.startsWith("失败")} className="btn-secondary">{saving?"保存中":"保存到数据库"}</button></div>}
        </div>)}

        {tab==="pdf"&&(<div className="card mb-6">
          <h3 className="font-semibold text-[#1A2332] mb-3">📄 PDF 文献导入</h3>
          <div className="border-2 border-dashed border-[#C5D3E0] rounded-lg p-6 text-center mb-3">
            <input type="file" accept=".pdf" onChange={e=>setPdfFile(e.target.files?.[0]||null)} className="hidden" id="pdf-in"/>
            <label htmlFor="pdf-in" className="cursor-pointer"><div className="text-3xl mb-1">📎</div><p className="text-sm">{pdfFile?pdfFile.name:"点击选择 PDF"}</p></label>
          </div>
          <button onClick={doPdf} disabled={pdfUp||!pdfFile} className="btn-primary w-full text-sm mb-3">{pdfUp?"分析中":"开始提取"}</button>
          {pdfErr&&<div className="text-sm p-3 rounded-lg mb-3 bg-[#FDE8E8] text-[#9B2C2C]">{pdfErr}</div>}
          {pdfResult&&<div><pre className="bg-[#F5F8FC] rounded-lg p-4 mb-3 text-sm overflow-auto max-h-96">{pdfResult}</pre><button onClick={doPdfSave} disabled={pdfSaving} className="btn-secondary">{pdfSaving?"保存中":"保存"}</button></div>}
        </div>)}

        {tab==="images"&&(<div className="card mb-6">
          <h3 className="font-semibold text-[#1A2332] mb-3">📷 图片 + 文字 → AI 生成</h3>
          <p className="text-sm text-[#6B7F96] mb-3">上传 PDF 截图 + 粘贴文献文字，AI 自动生成图文教学案例</p>
          <div className="border-2 border-dashed border-[#C5D3E0] rounded-lg p-6 text-center mb-3">
            <input type="file" accept="image/*" multiple onChange={e=>setImgFiles(Array.from(e.target.files||[]))} className="hidden" id="img-in"/>
            <label htmlFor="img-in" className="cursor-pointer"><div className="text-3xl mb-1">🖼️</div><p className="text-sm">{imgFiles.length>0?`已选 ${imgFiles.length} 张`:"点击选择图片（可多选）"}</p></label>
          </div>
          <textarea value={imgText} onChange={e=>setImgText(e.target.value)} rows={4} placeholder="粘贴 PDF 中的病例文字内容（可选，帮助 AI 更准确分析）..." className={`${selClass} mb-3 resize-none`}/>
          <button onClick={doImageUpload} disabled={imgUp||imgFiles.length===0} className="btn-primary w-full text-sm mb-3">{imgUp?"上传并生成中...":"上传图片并生成案例"}</button>
          {imgErr&&<div className={`text-sm p-3 rounded-lg mb-3 ${imgErr.startsWith("✅")?"bg-[#E8F4F0] text-[#0F6E56]":"bg-[#FDE8E8] text-[#9B2C2C]"}`}>{imgErr}</div>}
          {imgResult&&<div><pre className="bg-[#F5F8FC] rounded-lg p-4 mb-3 text-sm overflow-auto max-h-96">{imgResult}</pre><button onClick={doImgSave} disabled={imgSaving} className="btn-secondary">{imgSaving?"保存中":"保存"}</button></div>}
        </div>)}

        <div className="card"><h3 className="font-semibold text-[#1A2332] mb-2">说明</h3><ul className="text-sm text-[#6B7F96] space-y-1 list-disc list-inside"><li>生成的案例默认「未发布」，在病例管理中编辑发布</li><li>图片通过服务器 Service Role 上传 Storage，不依赖浏览器直传</li></ul></div>
      </div>
    </AppLayout>
  );
}
