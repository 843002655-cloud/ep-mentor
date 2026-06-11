"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { caseService, chatService } from "@/lib/services";
import { SkeletonBox } from "@/components/Skeleton";
import Markdown from "@/components/Markdown";
import type { CaseInput } from "@/lib/services";

interface Case {
  id: string; title: string; category: string; difficulty: string;
  description: string; ecg_findings: string[]; question: string;
  hint: string; key_points: string[]; is_published: boolean;
  mapping_system?: string; content_json?: Record<string, unknown>;
}
interface Message { role: "user" | "assistant" | "system"; content: string; }
interface Figure {
  figure_number: string; title: string; description: string;
  teaching_points: string; key_question: string; image_url?: string;
}

const catColors: Record<string, string> = {
  SVT: "bg-[#EBF2FA] dark:bg-blue-900/30 text-[#1B4F8A] dark:text-blue-300",
  VT: "bg-[#FDE8E8] dark:bg-red-900/30 text-[#9B2C2C] dark:text-red-300",
  AF: "bg-[#FEF3E2] dark:bg-amber-900/30 text-[#854F0B] dark:text-amber-300",
  AFL: "bg-[#EDE9FB] dark:bg-purple-900/30 text-[#4C3D9E] dark:text-purple-300",
};
const diffColors: Record<string, string> = {
  "基础": "bg-[#E8F4F0] dark:bg-emerald-900/30 text-[#0F6E56] dark:text-emerald-300",
  "进阶": "bg-[#FEF3E2] dark:bg-amber-900/30 text-[#854F0B] dark:text-amber-300",
  "高级": "bg-[#FDE8E8] dark:bg-red-900/30 text-[#9B2C2C] dark:text-red-300",
};

export default function CaseDetailPage() {
  const params = useParams(); const caseId = params.id as string;
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [figures, setFigures] = useState<Figure[]>([]);
  const [figIdx, setFigIdx] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    caseService.getCaseById(caseId).then((c) => {
      setCaseData(c as Case);
      const content = (c as Case).content_json;
      const extracted: Figure[] = [];
      const p = (content?.patient || {}) as Record<string, unknown>;
      const patientInfo = p.age
        ? `${p.gender || ""}，${p.age}岁。主诉：${p.chief_complaint || ""}。${p.history || ""}`
        : "";
      if (content && typeof content === "object") {
        const ecgObj = content.ecg_findings as Record<string, unknown> | undefined;
        const figsFromPdf = ecgObj?.figures as Figure[] | undefined;
        if (figsFromPdf && figsFromPdf.length > 0) {
          const imgUrls = (content.image_urls as string[]) || [];
          figsFromPdf.forEach((fig, i) => {
            if (!fig.image_url && imgUrls[i]) fig.image_url = imgUrls[i];
          });
          extracted.push(...figsFromPdf);
        }
        const imgUrls = (content.image_urls as string[]) || [];
        if (extracted.length === 0 && imgUrls.length > 0) {
          imgUrls.forEach((url, i) => extracted.push({
            figure_number: `图${i + 1}`,
            title: `PDF 页面 ${i + 1}`,
            description: "", teaching_points: "请观察图中的心电图/腔内图特征",
            key_question: "你在这张图中观察到了什么？请描述关键特征。",
            image_url: url,
          }));
        }
      }
      const introFigure: Figure = {
        figure_number: "病例背景",
        title: "患者信息与病史",
        description: patientInfo ? `${patientInfo}` : (c as Case).description,
        teaching_points: "在分析心电图之前，先了解患者的年龄、性别、主诉和既往史。病史往往能给你关键的诊断线索。",
        key_question: "阅读患者的病史后，你的初步印象是什么？哪些信息对你后续的分析可能有帮助？",
      };
      if (extracted.length === 0 && (c.ecg_findings?.length || 0) > 0) {
        (c.ecg_findings || []).forEach((finding, i) => {
          extracted.push({
            figure_number: `步骤 ${i + 1}`,
            title: `心电图发现 ${i + 1}`,
            description: finding,
            teaching_points: "请仔细观察这个发现，思考其诊断意义",
            key_question: `从这个发现中，你能推断出什么？它支持或排除了哪种诊断？`,
          });
        });
      }
      extracted.unshift(introFigure);
      setFigures(extracted);

      if (extracted.length > 0) {
        const f = extracted[0];
        setMessages([{
          role: "assistant",
          content: `欢迎来到电生理导管室。\n\n今天我们一起分析：**${c.title}**\n\n${extracted.length > 0 ? `我们将按步骤分析，共 ${extracted.length} 个关键发现。` : ""}\n\n📷 **${f.figure_number}: ${f.title}**\n\n${f.description ? "📖 " + f.description + "\n\n" : ""}🎯 ${f.teaching_points}\n\n${f.key_question}`,
        }]);
      } else {
        setMessages([{
          role: "assistant",
          content: `欢迎来到电生理导管室。\n\n今天的病例是：**${c.title}**\n\n${c.description}\n\n${c.question || "请分享你的初步分析。"}\n\n💡 ${c.hint || ""}`,
        }]);
      }
      setLoading(false);
    });
  }, [caseId]);

  const jumpToFigure = (idx: number) => {
    if (idx < 0 || idx >= figures.length) return;
    setFigIdx(idx);
    const f = figures[idx];
    // Append transition message instead of replacing history
    setMessages((prev) => [...prev, {
      role: "assistant" as const,
      content: `🔽 现在看向：**${f.figure_number}: ${f.title}**\n\n${f.description ? "📖 " + f.description + "\n\n" : ""}🎯 教学要点：${f.teaching_points}\n\n${f.key_question}`,
    }]);
  };

  const handleNextFigure = () => {
    const next = figIdx + 1;
    if (next >= figures.length) {
      setAllDone(true);
      return;
    }
    jumpToFigure(next);
  };

  const handleSend = async () => {
    if (!input.trim() || sending || !caseData) return;
    const userMessage: Message = { role: "user", content: input };
    setMessages((p) => [...p, userMessage]); setInput(""); setSending(true);
    try {
      // Build rich context from case data + content_json + current figure
      const ctx: CaseInput & { contentJson?: Record<string, unknown>; currentFigure?: Record<string, unknown> } = {
        title: caseData.title, category: caseData.category as CaseInput["category"],
        difficulty: caseData.difficulty as CaseInput["difficulty"],
        description: caseData.description, ecg_findings: caseData.ecg_findings,
        question: caseData.question, hint: caseData.hint,
        key_points: caseData.key_points, is_published: caseData.is_published,
        contentJson: caseData.content_json,
        currentFigure: figures[figIdx] as unknown as Record<string, unknown> || undefined,
      };
      const rawReply = await chatService.sendMessageStream(
        [...messages, userMessage].slice(-10), ctx, caseId, () => {}
      );
      let display = rawReply;
      try { const p = JSON.parse(rawReply); display = (p.content || rawReply) + (p.hint ? "\n\n💡 " + p.hint : ""); } catch {}
      setMessages((p) => [...p, { role: "assistant", content: display }]);
    } catch (err: unknown) {
      setMessages((p) => [...p, { role: "assistant", content: "抱歉：" + ((err as Error).message || "AI 暂不可用") }]);
    } finally { setSending(false); }
  };

  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, [messages]);

  if (loading) return <AppLayout><div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8"><div className="card mb-4"><div className="flex gap-2 mb-2"><SkeletonBox className="h-5 w-12 rounded-full" /><SkeletonBox className="h-5 w-10 rounded-full" /></div><SkeletonBox className="h-7 w-64 mb-1" /><SkeletonBox className="h-4 w-48" /></div><div className="grid lg:grid-cols-5 gap-4"><div className="lg:col-span-2"><div className="card p-3"><SkeletonBox className="h-4 w-48 mb-3" /><SkeletonBox className="h-60 w-full mb-3" /><div className="flex justify-between"><SkeletonBox className="h-4 w-16" /><SkeletonBox className="h-4 w-10" /><SkeletonBox className="h-4 w-16" /></div></div></div><div className="lg:col-span-3"><div className="card"><div className="h-[400px] sm:h-[450px] space-y-3 mb-4"><SkeletonBox className="h-16 w-3/4 ml-auto" /><SkeletonBox className="h-20 w-3/4" /><SkeletonBox className="h-16 w-2/3" /></div><div className="flex gap-2"><SkeletonBox className="flex-1 h-16 rounded-lg" /><SkeletonBox className="h-10 w-16 rounded-lg" /></div></div></div></div></div></AppLayout>;
  if (!caseData) return <AppLayout><div className="max-w-4xl mx-auto px-4 py-12 text-center text-[#6B7F96] dark:text-slate-400">病例未找到</div></AppLayout>;

  const patient = (caseData.content_json?.patient || {}) as Record<string, unknown>;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="card mb-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`badge-category ${catColors[caseData.category]||""}`}>{caseData.category}</span>
            <span className={`badge-difficulty ${diffColors[caseData.difficulty]||""}`}>{caseData.difficulty}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A2332] dark:text-slate-100 font-serif">{caseData.title}</h1>
          {patient.age != null ? <div className="text-sm text-[#6B7F96] dark:text-slate-400 mt-1">👤 {String(patient.gender||"")}，{String(patient.age)}岁 · 📋 {String(patient.chief_complaint||caseData.description)}</div> : null}
        </div>

        {/* All Done — show key points */}
        {allDone && (
          <div className="card mb-6">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🎉</div>
              <h2 className="text-xl font-bold text-[#1A2332] dark:text-slate-100 font-serif">学习完成！</h2>
              <p className="text-sm text-[#6B7F96] dark:text-slate-400">你已经完成了本病例全部图片的分析</p>
            </div>
            <h3 className="text-lg font-semibold text-[#1A2332] dark:text-slate-100 mb-3 font-serif">📚 关键知识点总结</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {((caseData.content_json?.key_points as string[]) || caseData.key_points || []).map((kp: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm text-[#3D5166] dark:text-slate-300">
                  <span className="text-[#1B4F8A] dark:text-blue-400 font-bold mt-0.5">{i + 1}.</span>
                  <span>{kp}</span>
                </div>
              ))}
            </div>
            <button onClick={() => { setAllDone(false); jumpToFigure(0); }} className="btn-primary mt-4">重新学习</button>
          </div>
        )}

        {/* Main: image + chat */}
        {!allDone && (
          <div className="grid lg:grid-cols-5 gap-4">
            {/* Left: figure navigator + image */}
            <div className="lg:col-span-2 order-1">
              {/* Figure progress */}
              {figures.length > 1 && (
                <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
                  {figures.map((f, i) => (
                    <button key={i} onClick={() => jumpToFigure(i)}
                      className={`shrink-0 px-2.5 py-1 rounded text-xs font-medium ${
                        i < figIdx ? "bg-[#E8F4F0] dark:bg-emerald-900/30 text-[#0F6E56] dark:text-emerald-300"
                        : i === figIdx ? "bg-[#1B4F8A] dark:bg-blue-600 text-white"
                        : "bg-[#F5F8FC] dark:bg-slate-800 text-[#6B7F96] dark:text-slate-400"}`}>
                      {i < figIdx ? "✅" : ""} {f.figure_number}
                    </button>
                  ))}
                </div>
              )}

              {/* Current figure card */}
              {figures[figIdx] && (
                <div className="card p-3 sticky top-20">
                  <div className="text-xs font-medium text-[#1A2332] dark:text-slate-100 mb-2">
                    {figures[figIdx].figure_number}: {figures[figIdx].title}
                  </div>
                  {figures[figIdx].image_url ? (
                    <img src={figures[figIdx].image_url} alt={figures[figIdx].title}
                      className="w-full rounded-lg mb-3 border border-[#E8ECF0] dark:border-slate-700" />
                  ) : (
                    <div className="bg-[#F5F8FC] dark:bg-slate-800 rounded-lg mb-3 h-40 flex items-center justify-center text-3xl">
                      📊
                    </div>
                  )}
                  {figures.length > 1 && (
                    <div className="flex items-center justify-between text-xs">
                      <button onClick={() => jumpToFigure(figIdx-1)} disabled={figIdx===0}
                        className="text-[#1B4F8A] dark:text-blue-400 disabled:opacity-30 hover:underline">← 上一张</button>
                      <span className="text-[#8FA0B4] dark:text-slate-500">{figIdx+1}/{figures.length}</span>
                      <button onClick={handleNextFigure}
                        className="text-[#1B4F8A] dark:text-blue-400 hover:underline">下一张 →</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: chat */}
            <div className="lg:col-span-3 order-2">
              <div className="card">
                <div ref={chatRef} className="h-[400px] sm:h-[450px] overflow-y-auto mb-4 space-y-3 pr-2">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 msg-enter ${msg.role==="user"?"justify-end":"justify-start"}`}>
                      {/* AI avatar */}
                      {msg.role === "assistant" && (
                        <div className="w-7 h-7 rounded-full bg-[#1B4F8A] dark:bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                          ⚡
                        </div>
                      )}
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role==="user"
                          ? "bg-[#1B4F8A] dark:bg-blue-600 text-white rounded-br-md"
                          : "bg-[#F5F8FC] dark:bg-slate-800 text-[#3D5166] dark:text-slate-300 rounded-bl-md border border-[#DDE5EE] dark:border-slate-700"
                      }`}>
                        <Markdown text={msg.content} />
                      </div>
                      {/* User avatar placeholder (right side) */}
                      {msg.role === "user" && (
                        <div className="w-7 h-7 rounded-full bg-[#E8ECF0] dark:bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 text-[#6B7F96] dark:text-slate-400">
                          👤
                        </div>
                      )}
                    </div>
                  ))}
                  {sending && (
                    <div className="flex gap-2 justify-start">
                      <div className="w-7 h-7 rounded-full bg-[#1B4F8A] dark:bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">⚡</div>
                      <div className="bg-[#F5F8FC] dark:bg-slate-800 border border-[#DDE5EE] dark:border-slate-700 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#8FA0B4] dark:bg-slate-500 animate-bounce" style={{animationDelay:"0ms"}} />
                        <span className="w-2 h-2 rounded-full bg-[#8FA0B4] dark:bg-slate-500 animate-bounce" style={{animationDelay:"150ms"}} />
                        <span className="w-2 h-2 rounded-full bg-[#8FA0B4] dark:bg-slate-500 animate-bounce" style={{animationDelay:"300ms"}} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <textarea value={input} onChange={(e)=>setInput(e.target.value)}
                    onKeyDown={(e)=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}}}
                    placeholder="输入你的分析..." rows={2} disabled={sending}
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-[#C5D3E0] dark:border-slate-600 rounded-lg text-sm text-[#1A2332] dark:text-slate-100 placeholder-[#8FA0B4] dark:placeholder-slate-500 focus:outline-none focus:border-[#1B4F8A] dark:focus:border-blue-400 resize-none" />
                  <button onClick={handleSend} disabled={sending||!input.trim()} className="btn-primary self-end text-sm px-4">发送</button>
                </div>
                {/* Action buttons */}
                {figures.length > 0 && figIdx < figures.length - 1 && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#E8ECF0] dark:border-slate-700">
                    <span className="text-xs text-[#8FA0B4] dark:text-slate-500">分析完当前步骤后：</span>
                    <button onClick={handleNextFigure} className="text-xs px-3 py-1 bg-[#EBF2FA] dark:bg-slate-700 text-[#1B4F8A] dark:text-blue-400 rounded-lg hover:bg-[#1B4F8A] dark:hover:bg-blue-600 hover:text-white transition-colors">
                      下一步 →
                    </button>
                  </div>
                )}
                {figures.length > 0 && figIdx === figures.length - 1 && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#E8ECF0] dark:border-slate-700">
                    <span className="text-xs text-[#8FA0B4] dark:text-slate-500">所有步骤已完成：</span>
                    <button onClick={handleNextFigure} className="text-xs px-3 py-1 bg-[#E8F4F0] dark:bg-emerald-900/30 text-[#0F6E56] dark:text-emerald-300 rounded-lg hover:bg-[#0F6E56] dark:hover:bg-emerald-700 hover:text-white transition-colors">
                      🎉 查看总结 →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
