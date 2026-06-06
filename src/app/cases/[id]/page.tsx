"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { getSupabase } from "@/lib/supabase";

interface Case {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  description: string;
  ecg_findings: string[];
  question: string;
  hint: string;
  key_points: string[];
  is_published: boolean;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const categoryColors: Record<string, string> = {
  SVT: "bg-svt/20 text-svt", VT: "bg-vt/20 text-vt",
  AF: "bg-af/20 text-af", AFL: "bg-afl/20 text-afl",
};

const difficultyColors: Record<string, string> = {
  "基础": "bg-diff-basic/20 text-diff-basic",
  "进阶": "bg-diff-intermediate/20 text-diff-intermediate",
  "高级": "bg-diff-advanced/20 text-diff-advanced",
};

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.id as string;
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [dailyQuota, setDailyQuota] = useState<number | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCase = async () => {
      const res = await fetch(`/api/cases/${caseId}`);
      const data = await res.json();
      if (data.case) {
        const c = data.case as Case;
        setCaseData(c);
        setMessages([{
          role: "assistant",
          content: `你好！我是你的电生理导师。\n\n今天的病例是：**${c.title}**\n\n${c.question}\n\n💡 提示：${c.hint}\n\n请分享你的初步分析，我们来一起探讨。`,
        }]);
      }
      setLoading(false);
    };
    fetchCase();

    getSupabase().auth.getUser().then(({ data: { user } }) => {
      if (user) {
        fetch("/api/progress")
          .then((r) => r.json())
          .then((data) => {
            if (data.progress) {
              const today = new Date().toISOString().split("T")[0];
              setDailyQuota(data.progress.filter((p: { completed_at: string }) => p.completed_at.startsWith(today)).length);
            }
          });
      }
    });
  }, [caseId]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseContext: {
            title: caseData?.title, category: caseData?.category,
            difficulty: caseData?.difficulty, description: caseData?.description,
            ecg_findings: caseData?.ecg_findings, key_points: caseData?.key_points,
            question: caseData?.question, hint: caseData?.hint,
          },
          messages: [...messages, userMessage].slice(-10),
          caseId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI 响应失败");
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      if (dailyQuota !== null) setDailyQuota((q) => (q ?? 0) + 1);
    } catch (err: unknown) {
      setMessages((prev) => [...prev, { role: "assistant", content: `抱歉，AI 导师暂时不可用：${(err as Error).message}` }]);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, [messages]);

  if (loading) return <AppLayout><div className="max-w-4xl mx-auto px-4 py-12 text-center text-ep-muted">加载中...</div></AppLayout>;
  if (!caseData) return <AppLayout><div className="max-w-4xl mx-auto px-4 py-12 text-center text-ep-muted">病例未找到</div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`badge-category ${categoryColors[caseData.category] || ""}`}>{caseData.category}</span>
            <span className={`badge-difficulty ${difficultyColors[caseData.difficulty] || ""}`}>{caseData.difficulty}</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">{caseData.title}</h1>
          <p className="text-ep-muted mb-4">{caseData.description}</p>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-ep-muted uppercase mb-2">心电图发现</h3>
            <ul className="list-disc list-inside space-y-1">
              {caseData.ecg_findings?.map((f, i) => <li key={i} className="text-sm text-white">{f}</li>)}
            </ul>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {caseData.key_points?.map((kp, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded bg-ep-primary/10 text-ep-primary">{kp}</span>
            ))}
          </div>
        </div>

        {dailyQuota !== null && (
          <div className="text-xs text-ep-muted mb-4 text-right">今日对话次数：{dailyQuota} / 20</div>
        )}

        <div className="card">
          <div ref={chatRef} className="h-[400px] overflow-y-auto mb-4 space-y-4 pr-2">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                  msg.role === "user" ? "bg-ep-primary text-white" : "bg-slate-800 text-white"
                }`}>
                  {msg.content.split("\n").map((line, j) => <span key={j}>{line}{j < msg.content.split("\n").length - 1 && <br />}</span>)}
                </div>
              </div>
            ))}
            {sending && <div className="flex justify-start"><div className="bg-slate-800 text-ep-muted rounded-xl px-4 py-3 text-sm">AI 导师思考中...</div></div>}
          </div>
          <div className="flex gap-3">
            <textarea
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="输入你的分析，按 Enter 发送..." rows={2} disabled={sending}
              className="flex-1 px-4 py-2.5 bg-ep-bg border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-ep-primary transition-colors resize-none"
            />
            <button onClick={handleSend} disabled={sending || !input.trim()} className="btn-primary self-end disabled:opacity-50">发送</button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
