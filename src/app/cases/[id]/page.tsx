"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { caseService, chatService, progressService } from "@/lib/services";
import type { CaseInput } from "@/lib/services";

interface Case {
  id: string; title: string; category: string; difficulty: string;
  description: string; ecg_findings: string[]; question: string;
  hint: string; key_points: string[]; is_published: boolean;
}
interface Message { role: "user" | "assistant" | "system"; content: string; }

const catColors: Record<string, string> = {
  SVT: "bg-[#EBF2FA] text-[#1B4F8A]", VT: "bg-[#FDE8E8] text-[#9B2C2C]",
  AF: "bg-[#FEF3E2] text-[#854F0B]", AFL: "bg-[#EDE9FB] text-[#4C3D9E]",
};
const diffColors: Record<string, string> = {
  "基础": "bg-[#E8F4F0] text-[#0F6E56]", "进阶": "bg-[#FEF3E2] text-[#854F0B]", "高级": "bg-[#FDE8E8] text-[#9B2C2C]",
};

export default function CaseDetailPage() {
  const params = useParams(); const caseId = params.id as string;
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [quota, setQuota] = useState<{ remaining: number; total: number } | null>(null);
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    caseService.getCaseById(caseId).then((c) => {
      setCaseData(c);
      setMessages([{ role: "assistant", content: `你好！我是你的电生理导师。\n\n今天的病例是：**${c.title}**\n\n${c.question}\n\n💡 提示：${c.hint}\n\n请分享你的初步分析，我们来一起探讨。` }]);
      setLoading(false);
    });
    // Fetch initial quota from DB
    progressService.getQuota().then((d) => {
      if (d.total) setQuota({ remaining: d.remaining, total: d.total });
      if (d.remaining === 0) setQuotaExhausted(true);
    }).catch(() => {});
  }, [caseId]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userMessage: Message = { role: "user", content: input };
    setMessages((p) => [...p, userMessage]); setInput(""); setSending(true);
    try {
      // 移植小程序时：将 sendMessageStream 改为 sendMessage（非流式）
      const rawReply = await chatService.sendMessageStream(
        [...messages, userMessage].slice(-10),
        caseData as CaseInput,
        caseId,
        () => {}
      );
      // 解析 AI 的 JSON 结构化回复
      let displayContent = rawReply;
      let aiHint = "";
      try {
        const parsed = JSON.parse(rawReply);
        displayContent = parsed.content || rawReply;
        aiHint = parsed.hint || "";
      } catch { /* 非 JSON 时直接显示原文 */ }
      const messageContent = aiHint
        ? displayContent + "\n\n💡 提示：" + aiHint
        : displayContent;
      setMessages((p) => [...p, { role: "assistant", content: messageContent }]);
      if (quota !== null) setQuota((q) => q ? { ...q, remaining: q.remaining - 1 } : null);
    } catch (err: unknown) {
      const msg = (err as Error).message || "";
      if (msg.includes("429") || msg.includes("上限")) {
        setQuotaExhausted(true);
      }
      setMessages((p) => [...p, { role: "assistant", content: `抱歉：${msg || "AI 导师暂时不可用"}` }]);
    } finally { setSending(false); }
  };

  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, [messages]);
  if (loading) return <AppLayout><div className="max-w-4xl mx-auto px-4 py-12 text-center text-[#6B7F96]">加载中...</div></AppLayout>;
  if (!caseData) return <AppLayout><div className="max-w-4xl mx-auto px-4 py-12 text-center text-[#6B7F96]">病例未找到</div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-3"><span className={`badge-category ${catColors[caseData.category]||""}`}>{caseData.category}</span><span className={`badge-difficulty ${diffColors[caseData.difficulty]||""}`}>{caseData.difficulty}</span></div>
          <h1 className="text-2xl font-bold text-[#1A2332] mb-3 font-serif">{caseData.title}</h1>
          <p className="text-[#6B7F96] mb-4">{caseData.description}</p>
          <div className="mb-4"><h3 className="text-sm font-semibold text-[#8FA0B4] uppercase mb-2">心电图发现</h3><ul className="list-disc list-inside space-y-1">{caseData.ecg_findings?.map((f,i)=><li key={i} className="text-sm text-[#3D5166]">{f}</li>)}</ul></div>
          <div className="flex flex-wrap gap-1.5">{caseData.key_points?.map((kp,i)=><span key={i} className="text-xs px-2 py-0.5 rounded bg-[#EBF2FA] text-[#1B4F8A]">{kp}</span>)}</div>
        </div>
        {quota !== null && (
          <div className={`flex items-center justify-between mb-4 text-xs px-3 py-2 rounded-lg ${
            quota.remaining <= 5 && quota.remaining > 0
              ? "bg-[#FEF3E2] text-[#854F0B]"
              : quota.remaining === 0
              ? "bg-[#FDE8E8] text-[#9B2C2C]"
              : "bg-[#F5F8FC] text-[#6B7F96]"
          }`}>
            <span>
              今日剩余 {quota.remaining} 次对话
              {quota.remaining <= 5 && quota.remaining > 0 && " ⚠️"}
            </span>
            {quota.remaining === 0 && (
              <a href="/upgrade" className="font-medium text-[#1B4F8A] hover:underline">升级会员 →</a>
            )}
          </div>
        )}
        {quotaExhausted && (
          <div className="mb-4 text-center">
            <p className="text-sm text-[#9B2C2C] mb-2">今日次数已用完，明天再来</p>
            <a href="/upgrade" className="text-sm text-[#1B4F8A] hover:underline">升级会员，无限对话 →</a>
          </div>
        )}
        <div className="card">
          <div ref={chatRef} className="h-[400px] overflow-y-auto mb-4 space-y-4 pr-2">
            {messages.map((msg,i)=>(<div key={i} className={`flex ${msg.role==="user"?"justify-end":"justify-start"}`}><div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${msg.role==="user"?"bg-[#1B4F8A] text-white":"bg-[#F5F8FC] text-[#3D5166]"}`}>{msg.content.split("\n").map((l,j)=><span key={j}>{l}{j<msg.content.split("\n").length-1&&<br/>}</span>)}</div></div>))}
            {sending && <div className="flex justify-start"><div className="bg-[#F5F8FC] text-[#8FA0B4] rounded-xl px-4 py-3 text-sm">AI 导师思考中...</div></div>}
          </div>
          <div className="flex gap-3">
            <textarea value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}}} placeholder="输入你的分析，按 Enter 发送..." rows={2} disabled={sending || quotaExhausted} className="flex-1 px-4 py-2.5 bg-white border border-[#C5D3E0] rounded-lg text-[#1A2332] placeholder-[#8FA0B4] focus:outline-none focus:border-[#1B4F8A] transition-colors resize-none disabled:bg-gray-100" />
            <button onClick={handleSend} disabled={sending||!input.trim()||quotaExhausted} className="btn-primary self-end disabled:opacity-50">发送</button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
