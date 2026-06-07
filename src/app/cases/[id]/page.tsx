"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { caseService, chatService } from "@/lib/services";
import type { CaseInput } from "@/lib/services";

interface Case {
  id: string; title: string; category: string; difficulty: string;
  description: string; ecg_findings: string[]; question: string;
  hint: string; key_points: string[]; is_published: boolean;
  mapping_system?: string; content_json?: Record<string, unknown>;
}
interface Message { role: "user" | "assistant" | "system"; content: string; }

const catColors: Record<string, string> = {
  SVT: "bg-[#EBF2FA] text-[#1B4F8A]", VT: "bg-[#FDE8E8] text-[#9B2C2C]",
  AF: "bg-[#FEF3E2] text-[#854F0B]", AFL: "bg-[#EDE9FB] text-[#4C3D9E]",
};
const diffColors: Record<string, string> = {
  "基础": "bg-[#E8F4F0] text-[#0F6E56]", "进阶": "bg-[#FEF3E2] text-[#854F0B]", "高级": "bg-[#FDE8E8] text-[#9B2C2C]",
};

interface Figure {
  figure_number: string; title: string; description: string;
  teaching_points: string; key_question: string; image_url?: string;
}

export default function CaseDetailPage() {
  const params = useParams(); const caseId = params.id as string;
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [rich, setRich] = useState<Record<string, unknown> | null>(null);
  const [figures, setFigures] = useState<Figure[]>([]);
  const [currentFig, setCurrentFig] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    caseService.getCaseById(caseId).then((c) => {
      setCaseData(c as Case);
      // Parse rich content if available
      const content = (c as Case).content_json;
      if (content && typeof content === "object") {
        setRich(content as Record<string, unknown>);
        // Extract figures
        const ecgFigs = (content.ecg_findings as Record<string, unknown>)?.figures as Figure[];
        setFigures(ecgFigs || []);
        // Auto-start with first figure's question
        if (ecgFigs && ecgFigs.length > 0) {
          const f = ecgFigs[0];
          setMessages([{
            role: "assistant",
            content: `欢迎来到电生理导管室。\n\n今天的病例是：**${c.title}**\n\n我们按图片顺序，逐步分析心电图和腔内图。\n\n📷 **${f.figure_number}: ${f.title}**\n\n📖 ${f.description}\n\n🎯 教学要点：${f.teaching_points}\n\n${f.key_question}`,
          }]);
        }
      } else {
        // Fallback for flat cases
        setMessages([{
          role: "assistant",
          content: `欢迎！今天的病例是：**${c.title}**\n\n${c.description}\n\n💡 提示：${c.hint}\n\n${c.question}\n\n请分享你的分析。`,
        }]);
      }
      setLoading(false);
    });
  }, [caseId]);

  const goToFigure = (idx: number) => {
    if (idx < 0 || idx >= figures.length) return;
    setCurrentFig(idx);
    const f = figures[idx];
    setMessages([{
      role: "assistant",
      content: `📷 **${f.figure_number}: ${f.title}**\n\n📖 ${f.description}\n\n🎯 教学要点：${f.teaching_points}\n\n${f.key_question}`,
    }]);
  };

  const handleSend = async () => {
    if (!input.trim() || sending || !caseData) return;
    const userMessage: Message = { role: "user", content: input };
    setMessages((p) => [...p, userMessage]); setInput(""); setSending(true);
    try {
      const rawReply = await chatService.sendMessageStream(
        [...messages, userMessage].slice(-10), caseData as CaseInput, caseId, () => {}
      );
      let displayContent = rawReply;
      try { const p = JSON.parse(rawReply); displayContent = (p.content || rawReply) + (p.hint ? "\n\n💡 提示：" + p.hint : ""); } catch {}
      setMessages((p) => [...p, { role: "assistant", content: displayContent }]);
    } catch (err: unknown) {
      setMessages((p) => [...p, { role: "assistant", content: "抱歉：" + ((err as Error).message || "AI 暂不可用") }]);
    } finally { setSending(false); }
  };

  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, [messages]);

  if (loading) return <AppLayout><div className="max-w-5xl mx-auto px-4 py-12 text-center text-[#6B7F96]">标测信号中...</div></AppLayout>;
  if (!caseData) return <AppLayout><div className="max-w-5xl mx-auto px-4 py-12 text-center text-[#6B7F96]">病例未找到</div></AppLayout>;

  const patient = rich?.patient as Record<string, unknown> | undefined;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="card mb-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`badge-category ${catColors[caseData.category]||""}`}>{caseData.category}</span>
            <span className={`badge-difficulty ${diffColors[caseData.difficulty]||""}`}>{caseData.difficulty}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A2332] mb-2 font-serif">{caseData.title}</h1>
          {patient ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#6B7F96] mb-1">
              {patient.age ? <span>👤 {String(patient.gender || "")}，{String(patient.age)}岁</span> : null}
              {patient.chief_complaint ? <span>📋 {String(patient.chief_complaint)}</span> : null}
            </div>
          ) : null}
          <p className="text-sm text-[#6B7F96]">{caseData.description}</p>
        </div>

        {/* Figure Navigator — only show if we have figures */}
        {figures.length > 0 && (
          <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
            {figures.map((f, i) => (
              <button
                key={i}
                onClick={() => goToFigure(i)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  i === currentFig
                    ? "bg-[#1B4F8A] text-white"
                    : i < currentFig
                    ? "bg-[#E8F4F0] text-[#0F6E56]"
                    : "bg-[#F5F8FC] text-[#6B7F96] hover:bg-[#EBF2FA]"
                }`}
              >
                {i < currentFig ? "✅ " : ""}{f.figure_number}
              </button>
            ))}
          </div>
        )}

        {/* Main: Image + Chat */}
        <div className="grid lg:grid-cols-5 gap-4">
          {/* Image Panel */}
          <div className="lg:col-span-2 order-1">
            {figures.length > 0 && figures[currentFig] && (
              <div className="card sticky top-20 p-3">
                <div className="text-xs font-medium text-[#1A2332] mb-2">{figures[currentFig].figure_number}: {figures[currentFig].title}</div>
                <div className="bg-[#0a0e1a] rounded-lg overflow-hidden mb-3 min-h-[200px] flex items-center justify-center">
                  {figures[currentFig].image_url ? (
                    <img src={figures[currentFig].image_url} alt={figures[currentFig].title} className="w-full h-auto" />
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-2">📊</div>
                      <p className="text-xs text-slate-400">图片将从PDF提取到<br/>Supabase Storage后显示</p>
                      <p className="text-xs text-slate-500 mt-1">上传PDF时自动提取页面图片</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <button onClick={() => goToFigure(currentFig - 1)} disabled={currentFig === 0} className="text-xs px-3 py-1 border border-[#C5D3E0] rounded text-[#4B6080] hover:border-[#1B4F8A] disabled:opacity-30">← 上一张</button>
                  <span className="text-xs text-[#8FA0B4]">{currentFig + 1} / {figures.length}</span>
                  <button onClick={() => goToFigure(currentFig + 1)} disabled={currentFig === figures.length - 1} className="text-xs px-3 py-1 border border-[#C5D3E0] rounded text-[#4B6080] hover:border-[#1B4F8A] disabled:opacity-30">下一张 →</button>
                </div>
              </div>
            )}
          </div>

          {/* Chat Panel */}
          <div className="lg:col-span-3 order-2">
            <div className="card">
              <div ref={chatRef} className="h-[400px] sm:h-[450px] overflow-y-auto mb-4 space-y-3 pr-2">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role==="user"?"justify-end":"justify-start"}`}>
                    <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${msg.role==="user"?"bg-[#1B4F8A] text-white":"bg-[#F5F8FC] text-[#3D5166]"}`}>
                      {msg.content.split("\n").map((l,j)=><span key={j}>{l}{j<msg.content.split("\n").length-1&&<br/>}</span>)}
                    </div>
                  </div>
                ))}
                {sending && <div className="flex justify-start"><div className="bg-[#F5F8FC] text-[#8FA0B4] rounded-xl px-4 py-3 text-sm">AI 导师思考中...</div></div>}
              </div>
              <div className="flex gap-2">
                <textarea value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}}} placeholder="输入你的分析..." rows={2} disabled={sending} className="flex-1 px-3 py-2 bg-white border border-[#C5D3E0] rounded-lg text-sm text-[#1A2332] placeholder-[#8FA0B4] focus:outline-none focus:border-[#1B4F8A] resize-none" />
                <button onClick={handleSend} disabled={sending||!input.trim()} className="btn-primary self-end text-sm px-4">发送</button>
              </div>
            </div>
          </div>
        </div>

        {/* Key Points */}
        <div className="card mt-6">
          <h3 className="text-lg font-semibold text-[#1A2332] mb-3 font-serif">📚 关键知识点</h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {(rich?.key_points as string[] || caseData.key_points || []).map((kp, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-[#3D5166]">
                <span className="text-[#1B4F8A] font-bold mt-0.5">{i + 1}.</span>
                <span>{kp}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
