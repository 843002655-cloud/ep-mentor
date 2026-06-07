"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { caseService } from "@/lib/services";

const selClass = "w-full px-3 py-2 bg-white border border-[#C5D3E0] rounded text-sm focus:outline-none focus:border-[#1B4F8A]";

export default function CreateCasePage() {
  // Images
  const [images, setImages] = useState<{ file: File; url: string; label: string }[]>([]);
  const [imgUploading, setImgUploading] = useState(false);
  // PDF text + video
  const [pdfText, setPdfText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  // Category/difficulty
  const [category, setCategory] = useState("SVT");
  const [difficulty, setDifficulty] = useState("进阶");
  // Generate
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // ── Image handling ──────────────────────────────────────────
  const addImages = (files: FileList | null) => {
    if (!files) return;
    const newImgs = Array.from(files).map((f, i) => ({
      file: f,
      url: URL.createObjectURL(f),
      label: `图${images.length + i + 1}`,
    }));
    setImages((prev) => [...prev, ...newImgs]);
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const arr = [...images];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    // Re-label
    arr.forEach((img, i) => (img.label = `图${i + 1}`));
    setImages(arr);
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx).map((img, i) => ({ ...img, label: `图${i + 1}` })));
  };

  // ── PDF text extraction (via server-side markitdown) ────────
  const extractPdfText = async () => {
    if (!pdfFile) return;
    setMsg("正在通过 markitdown 提取 PDF 文字...");
    try {
      const fd = new FormData();
      fd.append("file", pdfFile);
      const res = await fetch("/api/extract-pdf-text", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提取失败");
      setPdfText(data.text);
      setMsg(`✅ 提取 ${data.text.length} 字`);
    } catch (e) {
      setMsg("PDF 提取失败：" + (e as Error).message + "。请手动粘贴文字");
    }
  };

  // ── Resize image before upload ──────────────────────────────
  const resizeImage = (file: File, maxW = 1200): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        if (scale >= 1) { resolve(file); return; }
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((b) => resolve(b || file), "image/jpeg", 0.7);
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  };

  // ── Upload all images ───────────────────────────────────────
  const uploadAllImages = async (): Promise<string[]> => {
    if (images.length === 0) return [];
    setImgUploading(true);
    const urls: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const compressed = await resizeImage(images[i].file);
      const fd = new FormData();
      fd.append("file", compressed, "image.jpg");
      try {
        const res = await fetch("/api/upload-image", { method: "POST", body: fd });
        if (res.ok) {
          const d = await res.json();
          if (d.url) urls.push(d.url as string);
        } else {
          console.warn("Upload failed for image", i, await res.text());
        }
      } catch(e) { console.warn("Upload error for image", i, e); }
    }
    setImgUploading(false);
    if (urls.length === 0 && images.length > 0) {
      setMsg("⚠️ 所有图片上传失败。检查 Storage bucket 是否存在且设为 Public");
    }
    return urls;
  };

  // ── Video upload ────────────────────────────────────────────
  const uploadVideo = async (): Promise<string | null> => {
    if (videoUrl.trim()) return videoUrl.trim(); // Already a URL
    if (!videoFile) return null;
    const fd = new FormData();
    fd.append("file", videoFile);
    try {
      const res = await fetch("/api/upload-image", { method: "POST", body: fd }); // Reuse image upload
      if (res.ok) {
        const d = await res.json();
        return (d.url as string) || null;
      }
    } catch { /* skip */ }
    return null;
  };

  // ── Generate ────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (images.length === 0 && !pdfText.trim()) { setMsg("请至少上传图片或提供 PDF 文字"); return; }
    setGenerating(true); setMsg(""); setResult("");

    try {
      // Upload images first
      const imageUrls = await uploadAllImages();
      if (imageUrls.length === 0 && images.length > 0) {
        setMsg("⚠️ 图片上传失败，但将继续生成文字内容");
      }
      // Upload video
      const vUrl = await uploadVideo();

      // Call AI
      const res = await fetch("/api/generate-full-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: pdfText || "请根据提供的图片生成电生理教学案例",
          imageUrls,
          videoUrl: vUrl,
          category,
          difficulty,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      setResult(JSON.stringify(data.case, null, 2));
      setMsg(imageUrls.length > 0 ? `✅ ${imageUrls.length} 张图片 + 病例已生成` : "✅ 病例已生成");
    } catch (e) {
      setMsg("生成失败：" + (e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  // ── Save ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const c = JSON.parse(result);
      await caseService.createCase({
        title: c.title || "未命名",
        category: c.category || category,
        difficulty: c.difficulty || difficulty,
        description: c.description || "",
        ecg_findings: c.ecg_findings?.details || [],
        question: "",
        hint: "",
        key_points: c.key_points || [],
        is_published: false,
        mapping_system: c.mapping_system || "",
        content_json: c as Record<string, unknown>,
      } as never);
      setResult(""); setMsg("");
      alert("病例已保存！");
    } catch { alert("保存失败"); }
    finally { setSaving(false); }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-3xl font-bold text-[#1A2332] mb-2 font-serif">创建新病例</h1>
        <p className="text-[#6B7F96] mb-6">上传素材，AI 自动生成苏格拉底式互动教学病例</p>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Column 1: Images */}
          <div className="card">
            <h3 className="font-semibold text-[#1A2332] mb-3">📷 图片（按PDF图号顺序）</h3>
            <div className="border-2 border-dashed border-[#C5D3E0] rounded-lg p-4 text-center mb-3">
              <input type="file" accept="image/*" multiple onChange={(e) => addImages(e.target.files)} className="hidden" id="img-upload" />
              <label htmlFor="img-upload" className="cursor-pointer block">
                <div className="text-2xl mb-1">📁</div>
                <p className="text-sm text-[#1B4F8A]">点击添加图片</p>
                <p className="text-xs text-[#8FA0B4]">按 PDF 图号顺序选择</p>
              </label>
            </div>
            {images.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {images.map((img, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-[#F5F8FC] rounded-lg">
                    <img src={img.url} className="w-12 h-12 object-cover rounded" />
                    <input value={img.label} onChange={(e) => { const arr = [...images]; arr[idx].label = e.target.value; setImages(arr); }} className="flex-1 text-xs px-2 py-1 border border-[#C5D3E0] rounded" />
                    <button onClick={() => moveImage(idx, idx - 1)} disabled={idx === 0} className="text-xs px-1.5 py-0.5 border rounded disabled:opacity-30">↑</button>
                    <button onClick={() => moveImage(idx, idx + 1)} disabled={idx === images.length - 1} className="text-xs px-1.5 py-0.5 border rounded disabled:opacity-30">↓</button>
                    <button onClick={() => removeImage(idx)} className="text-xs text-red-500">✕</button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-[#8FA0B4] mt-2">{images.length} 张 · 拖拽排序或 ↑↓ 调整 · 可修改图号标签</p>
          </div>

          {/* Column 2: PDF text */}
          <div className="card">
            <h3 className="font-semibold text-[#1A2332] mb-3">📄 PDF 文字</h3>
            <div className="border-2 border-dashed border-[#C5D3E0] rounded-lg p-4 text-center mb-3">
              <input type="file" accept=".pdf" onChange={(e) => { const f = e.target.files?.[0]; setPdfFile(f || null); if (f) extractPdfText(); }} className="hidden" id="pdf-upload" />
              <label htmlFor="pdf-upload" className="cursor-pointer block">
                <div className="text-2xl mb-1">📎</div>
                <p className="text-sm text-[#1B4F8A]">{pdfFile ? pdfFile.name : "点击上传PDF"}</p>
                <p className="text-xs text-[#8FA0B4]">自动提取文字</p>
              </label>
            </div>
            <textarea value={pdfText} onChange={(e) => setPdfText(e.target.value)} rows={10} placeholder="或直接粘贴PDF文字内容..."
              className={`${selClass} resize-none`} />
          </div>

          {/* Column 3: Video + Settings */}
          <div className="card">
            <h3 className="font-semibold text-[#1A2332] mb-3">🎬 视频 & 设置</h3>
            <label className="block text-xs text-[#3D5166] mb-1">视频链接</label>
            <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://... 或上传文件" className={`${selClass} mb-2`} />
            <div className="border-2 border-dashed border-[#C5D3E0] rounded-lg p-3 text-center mb-3">
              <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} className="hidden" id="video-upload" />
              <label htmlFor="video-upload" className="cursor-pointer block text-xs text-[#1B4F8A]">
                {videoFile ? videoFile.name : "📁 点击上传视频文件"}
              </label>
            </div>
            <label className="block text-xs text-[#3D5166] mb-1">分类</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${selClass} mb-2`}>
              {["SVT", "VT", "AF", "AFL"].map((o) => <option key={o}>{o}</option>)}
            </select>
            <label className="block text-xs text-[#3D5166] mb-1">难度</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={selClass}>
              {["基础", "进阶", "高级"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>

        {/* Generate button */}
        <button onClick={handleGenerate} disabled={generating || imgUploading}
          className="btn-primary w-full py-3 text-lg mb-4">
          {generating ? "🤖 AI 正在分析生成..."
            : imgUploading ? "📤 正在上传素材..."
            : "🤖 一键生成苏格拉底式教学病例"}
        </button>

        {msg && <div className={`text-sm p-3 rounded-lg mb-4 ${msg.startsWith("✅") ? "bg-[#E8F4F0] text-[#0F6E56]" : msg.startsWith("⚠") ? "bg-[#FEF3E2] text-[#854F0B]" : "bg-[#FDE8E8] text-[#9B2C2C]"}`}>{msg}</div>}

        {/* Result preview */}
        {result && (
          <div className="card mb-4">
            <h3 className="font-semibold text-[#1A2332] mb-2">预览</h3>
            <pre className="bg-[#F5F8FC] rounded-lg p-4 text-sm overflow-auto max-h-96">{result}</pre>
            <button onClick={handleSave} disabled={saving} className="btn-primary mt-3">{saving ? "保存中..." : "💾 保存到数据库"}</button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
