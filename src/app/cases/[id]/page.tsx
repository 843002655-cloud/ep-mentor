"use client";

import { useEffect, useState, useRef } from "react";
import { flushSync } from "react-dom";
import { useParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { caseService, chatService, progressService } from "@/lib/services";
import { SkeletonBox } from "@/components/Skeleton";
import Markdown from "@/components/Markdown";
import type { CaseInput } from "@/lib/services";
import { usePageTitle } from "@/lib/hooks/usePageTitle";
import { formatSource } from "@/lib/source-utils";
import {
  buildFigureIntroMessage,
  enrichFiguresFromContent,
  isGenericFigure,
} from "@/lib/figure-utils";
import { getOrCreateLearnerId } from "@/lib/learner-id";
import { ROUTES } from "@/lib/routes";
import {
  createTeachingState,
  EP_STEP_LABELS,
  normalizeTeachingState,
  type TeachingState,
} from "@/lib/teaching-state";
import type { ChatReplyMeta } from "@/lib/teaching-state";

interface Case {
  id: string; title: string; category: string; difficulty: string;
  description: string; ecg_findings: string[]; question: string;
  hint: string; key_points: string[]; is_published: boolean;
  mapping_system?: string; content_json?: Record<string, unknown>;
}
interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  _uiOnly?: boolean;
}

interface ChatSession {
  messages: Message[];
  figIdx: number;
  teachingState: TeachingState;
  allDone?: boolean;
  evaluationDone?: boolean;
}

interface Figure {
  figure_number: string; title: string; description: string;
  teaching_points: string; key_question: string; image_url?: string;
}

const catColors: Record<string, string> = {
  SVT: "bg-[#EBF2FA] dark:bg-blue-900/30 text-[#1B4F8A] dark:text-blue-300",
  VT: "bg-[#FDE8E8] dark:bg-red-900/30 text-[#9B2C2C] dark:text-red-300",
  AF: "bg-[#FEF3E2] dark:bg-amber-900/30 text-[#854F0B] dark:text-amber-300",
  // AFL merged into AF
};
const diffColors: Record<string, string> = {
  "基础": "bg-[#E8F4F0] dark:bg-emerald-900/30 text-[#0F6E56] dark:text-emerald-300",
  "进阶": "bg-[#FEF3E2] dark:bg-amber-900/30 text-[#854F0B] dark:text-amber-300",
  "高级": "bg-[#FDE8E8] dark:bg-red-900/30 text-[#9B2C2C] dark:text-red-300",
};

function sessionKey(caseId: string) {
  return `chat_session_${caseId}`;
}

function loadSession(caseId: string): ChatSession | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = sessionStorage.getItem(sessionKey(caseId));
    return saved ? (JSON.parse(saved) as ChatSession) : null;
  } catch {
    return null;
  }
}

function buildWelcomeMessage(
  title: string,
  figure: Figure,
  figureCount: number,
  sourceLine: string
): Message {
  return {
    role: "assistant",
    content: `${sourceLine}欢迎来到电生理导管室。\n\n今天我们一起分析：**${title}**\n\n我们将按步骤分析，共 ${figureCount} 个关键步骤。\n\n📷 **${figure.figure_number}: ${figure.title}**\n\n${figure.description ? "📖 " + figure.description + "\n\n" : ""}🎯 ${figure.teaching_points}\n\n${figure.key_question}`,
  };
}

export default function CaseDetailPage() {
  usePageTitle("病例详情");
  const params = useParams(); const caseId = params.id as string;
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [figures, setFigures] = useState<Figure[]>([]);
  const [figIdx, setFigIdx] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [teachingState, setTeachingState] = useState<TeachingState>(() => createTeachingState(0));
  const [messageMeta, setMessageMeta] = useState<Record<number, ChatReplyMeta>>({});
  const [evaluationDone, setEvaluationDone] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<number, "up" | "down">>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`feedback_${caseId}`);
        return saved ? JSON.parse(saved) : {};
      } catch { return {}; }
    }
    return {};
  });
  const [isComposing, setIsComposing] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [allDone, setAllDone] = useState(false);
  const [introGenerating, setIntroGenerating] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const completionRecordedRef = useRef(false);
  const introPlaceholderRef = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    setLoading(true);
    setLoadError("");
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
      const enrichedDb = enrichFiguresFromContent(extracted, content);
      const enriched: Figure[] = [introFigure, ...enrichedDb];
      setFigures(enriched);

      const rawSource = (c.content_json?.source as string) || "";
      const cleanSource = formatSource(rawSource);
      const sourceLine = cleanSource ? `📖 来源：${cleanSource}\n\n` : "";

      const saved = loadSession(caseId);
      if (saved?.messages?.length) {
        setMessages(saved.messages);
        setFigIdx(saved.figIdx ?? 0);
        setTeachingState(normalizeTeachingState(saved.teachingState, saved.figIdx ?? 0));
        setAllDone(Boolean(saved.allDone));
        setEvaluationDone(Boolean(saved.evaluationDone));
      } else if (enriched.length > 0) {
        setMessages([buildWelcomeMessage(c.title, enriched[0], enriched.length, sourceLine)]);
        setFigIdx(0);
        setTeachingState(createTeachingState(0));
      } else {
        setMessages([{
          role: "assistant",
          content: `${sourceLine}欢迎来到电生理导管室。\n\n今天的病例是：**${c.title}**\n\n${c.description}\n\n${c.question || "请分享你的初步分析。"}\n\n💡 ${c.hint || ""}`,
        }]);
      }
      setLoading(false);
    }).catch(() => {
      setLoadError("加载病例失败，请返回病例库重试");
      setLoading(false);
    });
  }, [caseId]);

  const buildCaseCtx = () => ({
    title: caseData!.title,
    category: caseData!.category as CaseInput["category"],
    difficulty: caseData!.difficulty as CaseInput["difficulty"],
    description: caseData!.description,
    ecg_findings: caseData!.ecg_findings,
    question: caseData!.question,
    hint: caseData!.hint,
    key_points: caseData!.key_points,
    is_published: caseData!.is_published,
    contentJson: caseData!.content_json,
    currentFigure: figures[figIdx] as unknown as Record<string, unknown> || undefined,
  });

  const jumpToFigure = async (idx: number) => {
    if (!caseData || idx < 0 || idx >= figures.length || introGenerating || sending) return;
    if (idx === figIdx) return;

    setFigIdx(idx);
    setTeachingState((prev) => ({ ...prev, figureIndex: idx }));
    const f = figures[idx];
    const header = `🔽 现在看向：**${f.figure_number}: ${f.title}**`;

    if (!isGenericFigure(f)) {
      setMessages((prev) => [...prev, {
        role: "assistant" as const,
        content: buildFigureIntroMessage(f),
      }]);
      return;
    }

    // 占位提问 → 用 AI 结合病例上下文生成针对性苏格拉底开场
    setIntroGenerating(true);
    setMessages((prev) => {
      introPlaceholderRef.current = prev.length;
      return [...prev, {
        role: "assistant" as const,
        content: `${header}\n\n⏳ 正在准备这一步的引导...`,
        _uiOnly: true,
      }];
    });
    setStreamingText(null);

    try {
      const ctx = { ...buildCaseCtx(), currentFigure: f as unknown as Record<string, unknown> };
      const apiMessages = messages.filter((m) => !m._uiOnly).slice(-10);
      const intro = await chatService.sendFigureIntroStream(
        apiMessages,
        ctx,
        caseId,
        idx,
        figures.length,
        (chunk) => {
          flushSync(() => setStreamingText(chunk));
        },
        { ...teachingState, figureIndex: idx }
      );
      const body = (intro.text || "").trim() || buildFigureIntroMessage(f);
      setMessages((prev) => {
        const idx = introPlaceholderRef.current;
        if (idx == null || idx >= prev.length) return prev;
        const next = [...prev];
        next[idx] = { role: "assistant", content: `${header}\n\n${body}` };
        return next;
      });
      setStreamingText(null);
    } catch {
      setMessages((prev) => {
        const idx = introPlaceholderRef.current;
        if (idx == null || idx >= prev.length) return prev;
        const next = [...prev];
        next[idx] = {
          role: "assistant",
          content: buildFigureIntroMessage(f),
        };
        return next;
      });
      setStreamingText(null);
    } finally {
      setIntroGenerating(false);
    }
  };

  const sendMessageToAI = async (
    userContent: string,
    opts?: { skipUserBubble?: boolean; forCompletion?: boolean }
  ) => {
    if (sending || !caseData) return;
    const userMessage: Message = { role: "user", content: userContent };
    if (!opts?.skipUserBubble) {
      setMessages((p) => [...p, userMessage]);
    }
    setSending(true);
    setStreamingText(null);
    try {
      const ctx = {
        title: caseData.title, category: caseData.category as CaseInput["category"],
        difficulty: caseData.difficulty as CaseInput["difficulty"],
        description: caseData.description, ecg_findings: caseData.ecg_findings,
        question: caseData.question, hint: caseData.hint,
        key_points: caseData.key_points, is_published: caseData.is_published,
        contentJson: caseData.content_json,
        currentFigure: figures[figIdx] as unknown as Record<string, unknown> || undefined,
      };
      const apiMessages = [
        ...messages.filter((m) => !m._uiOnly),
        userMessage,
      ].slice(-20);

      const result = await chatService.sendMessageStream(
        apiMessages,
        ctx,
        caseId,
        (chunk: string) => {
          flushSync(() => setStreamingText(chunk));
        },
        teachingState
      );

      let display = result.text;
      if (result.meta?.hint) {
        display += `\n\n💡 ${result.meta.hint}`;
      }

      setMessages((p) => {
        const next = [...p, { role: "assistant" as const, content: display }];
        if (result.meta) {
          setMessageMeta((prev) => ({ ...prev, [next.length - 1]: result.meta! }));
        }
        return next;
      });

      if (result.meta?.teachingState) {
        setTeachingState(result.meta.teachingState);
      }
      if (opts?.forCompletion) {
        setEvaluationDone(true);
      }
      setStreamingText(null);
    } catch (err: unknown) {
      setMessages((p) => [...p, { role: "assistant", content: "抱歉：" + ((err as Error).message || "AI 暂不可用") }]);
    } finally { setSending(false); }
  };

  const handleSend = () => {
    if (!input.trim() || sending) return;
    sendMessageToAI(input);
    setInput("");
  };

  const handleHint = () => {
    if (sending) return;
    sendMessageToAI("请给我一些提示");
  };

  const handleEvaluate = () => {
    if (sending || messages.length < 3) return;
    sendMessageToAI("请对我的表现做一个结构化评估，告诉我哪些方面做得好，哪些方面需要加强。");
  };

  const handleRestart = () => {
    if (figures.length === 0) return;
    const f = figures[0];
    setFigIdx(0);
    setTeachingState(createTeachingState(0));
    setMessageMeta({});
    setEvaluationDone(false);
    const rawSource2 = (caseData!.content_json?.source as string) || "";
    const cleanSource2 = formatSource(rawSource2);
    const sourceLine2 = cleanSource2 ? `📖 来源：${cleanSource2}\n\n` : "";
    setMessages([buildWelcomeMessage(caseData!.title, f, figures.length, sourceLine2)]);
    setAllDone(false);
    setStreamingText(null);
    setFeedbackMap({});
    if (typeof window !== "undefined") {
      try { localStorage.removeItem(`feedback_${caseId}`); } catch {}
      try { sessionStorage.removeItem(sessionKey(caseId)); } catch {}
    }
  };

  const handleFeedback = (msgIndex: number, type: "up" | "down") => {
    setFeedbackMap((prev) => {
      const next = { ...prev };
      if (next[msgIndex] === type) {
        delete next[msgIndex];
      } else {
        next[msgIndex] = type;
        chatService.submitFeedback({
          caseId,
          messageIndex: msgIndex,
          feedback: type,
          figureIndex: figIdx,
          epStep: teachingState.epStep,
        }).catch(() => {});
      }
      if (typeof window !== "undefined") {
        try { localStorage.setItem(`feedback_${caseId}`, JSON.stringify(next)); } catch {}
      }
      return next;
    });
  };

  const handleCopyConversation = () => {
    const text = messages
      .filter((m) => !m._uiOnly)
      .map((m) => `${m.role === "user" ? "👤 学员" : "⚡ AI导师"}:\n${m.content}`)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }, () => {});
  };

  const handleNextFigure = async () => {
    const next = figIdx + 1;
    if (next >= figures.length) {
      if (!evaluationDone) {
        const userTurns = messages.filter((m) => m.role === "user").length;
        if (userTurns >= 2) {
          await sendMessageToAI(
            "请对我的整体表现做一个结构化评估，包含诊断推理、知识掌握、思维系统性和改进建议四个维度。",
            { skipUserBubble: true, forCompletion: true }
          );
        } else {
          setEvaluationDone(true);
        }
      }
      setAllDone(true);
      return;
    }
    jumpToFigure(next);
  };

  // Auto-scroll only when user is already at the bottom
  const handleChatScroll = () => {
    const el = chatRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  };
  useEffect(() => {
    if (isAtBottomRef.current && chatRef.current) {
      chatRef.current.scrollTo(0, chatRef.current.scrollHeight);
    }
  }, [messages, streamingText]);
  useEffect(() => {
    if (!allDone || !caseId || completionRecordedRef.current || !evaluationDone) return;
    completionRecordedRef.current = true;
    progressService.markCaseComplete(caseId, getOrCreateLearnerId()).catch(() => {
      completionRecordedRef.current = false;
    });
  }, [allDone, caseId, evaluationDone]);

  useEffect(() => {
    if (messages.length === 0 || typeof window === "undefined") return;
    try {
      const payload: ChatSession = {
        messages,
        figIdx,
        teachingState,
        allDone,
        evaluationDone,
      };
      sessionStorage.setItem(sessionKey(caseId), JSON.stringify(payload));
    } catch {}
  }, [messages, figIdx, teachingState, allDone, evaluationDone, caseId]);
  // Close lightbox on Escape key
  useEffect(() => {
    if (!lightboxImg) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightboxImg(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxImg]);

  if (loading) return <AppLayout><div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8"><div className="card mb-4"><div className="flex gap-2 mb-2"><SkeletonBox className="h-5 w-12 rounded-full" /><SkeletonBox className="h-5 w-10 rounded-full" /></div><SkeletonBox className="h-7 w-64 mb-1" /><SkeletonBox className="h-4 w-48" /></div><div className="grid lg:grid-cols-5 gap-4"><div className="lg:col-span-2"><div className="card p-3"><SkeletonBox className="h-4 w-48 mb-3" /><SkeletonBox className="h-60 w-full mb-3" /><div className="flex justify-between"><SkeletonBox className="h-4 w-16" /><SkeletonBox className="h-4 w-10" /><SkeletonBox className="h-4 w-16" /></div></div></div><div className="lg:col-span-3"><div className="card"><div className="h-[400px] sm:h-[450px] space-y-3 mb-4"><SkeletonBox className="h-16 w-3/4 ml-auto" /><SkeletonBox className="h-20 w-3/4" /><SkeletonBox className="h-16 w-2/3" /></div><div className="flex gap-2"><SkeletonBox className="flex-1 h-16 rounded-lg" /><SkeletonBox className="h-10 w-16 rounded-lg" /></div></div></div></div></div></AppLayout>;
  if (loadError) return <AppLayout><div className="max-w-4xl mx-auto px-4 py-12 text-center"><p className="text-[#6B7F96] dark:text-slate-400 mb-4">{loadError}</p><a href={ROUTES.CASES} className="text-[#1B4F8A] dark:text-blue-400 hover:underline">← 返回病例库</a></div></AppLayout>;
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
          {caseData.content_json?.source ? <div className="text-xs text-[#8FA0B4] dark:text-slate-500 mt-1.5 flex items-center gap-1">📖 {formatSource(caseData.content_json.source as string)}</div> : null}
          <p className="text-xs text-[#8FA0B4] dark:text-slate-500 mt-2">
            💬 病例模式：AI 导师会通过提问引导你思考，不会直接给出答案。需要直接解答请前往
            {" "}<a href={ROUTES.AI_CONSULT} className="text-[#1B4F8A] dark:text-blue-400 hover:underline">AI 顾问</a>
          </p>
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
                    <button key={i} onClick={() => void jumpToFigure(i)} disabled={introGenerating}
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
                      loading="lazy"
                      onClick={() => setLightboxImg(figures[figIdx].image_url || null)}
                      className="w-full rounded-lg mb-3 border border-[#E8ECF0] dark:border-slate-700 cursor-zoom-in hover:opacity-95 transition-opacity" />
                  ) : figures[figIdx].figure_number === "病例背景" ? (
                    <div className="bg-[#F5F8FC] dark:bg-slate-800 rounded-lg mb-3 p-4 border border-dashed border-[#C5D3E0] dark:border-slate-600">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#E8F0F8] dark:bg-blue-900/40 flex items-center justify-center text-lg shrink-0">👤</div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#6B7F96] dark:text-slate-400 mb-1">文字背景 · 无需配图</p>
                          <p className="text-sm text-[#3D5166] dark:text-slate-300 leading-relaxed">{figures[figIdx].description || "暂无病史描述"}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#F5F8FC] dark:bg-slate-800 rounded-lg mb-3 h-24 flex items-center justify-center text-xs text-[#8FA0B4] dark:text-slate-500">暂无配图</div>
                  )}
                  {figures.length > 1 && (
                    <div className="flex items-center justify-between text-xs">
                      <button onClick={() => void jumpToFigure(figIdx-1)} disabled={figIdx===0 || introGenerating}
                        className="text-[#1B4F8A] dark:text-blue-400 disabled:opacity-30 hover:underline">← 上一张</button>
                      <span className="text-[#8FA0B4] dark:text-slate-500">{figIdx+1}/{figures.length}</span>
                      <button onClick={() => void handleNextFigure()} disabled={introGenerating}
                        className="text-[#1B4F8A] dark:text-blue-400 hover:underline">下一张 →</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: chat */}
            <div className="lg:col-span-3 order-2">
              <div className="card">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-[#E8ECF0] dark:border-slate-700">
                  <div className="text-xs text-[#6B7F96] dark:text-slate-400">
                    诊断步骤 <span className="font-semibold text-[#1B4F8A] dark:text-blue-400">{teachingState.epStep}/5</span>
                    {" · "}{EP_STEP_LABELS[teachingState.epStep]}
                  </div>
                  {figures.length > 0 && (
                    <div className="text-xs text-[#6B7F96] dark:text-slate-400">
                      当前步骤 <span className="font-semibold">{figIdx + 1}/{figures.length}</span>
                      {figures[figIdx]?.image_url ? " · 👁️ 视觉分析已启用" : ""}
                    </div>
                  )}
                </div>
                <div ref={chatRef} onScroll={handleChatScroll} className="h-[400px] sm:h-[450px] overflow-y-auto mb-4 space-y-3 pr-2">
                  {messages.map((msg, i) => {
                    const meta = messageMeta[i];
                    const assistantClass =
                      meta?.status === "hinting"
                        ? "bg-[#FEF3E2] dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                        : meta?.status === "confirming"
                          ? "bg-[#E8F4F0] dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                          : "bg-[#F5F8FC] dark:bg-slate-800 border-[#DDE5EE] dark:border-slate-700";
                    return (
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
                          : `${assistantClass} text-[#3D5166] dark:text-slate-300 rounded-bl-md border`
                      }`}>
                        {msg.role === "assistant" && meta?.status === "hinting" && (
                          <div className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-300 mb-1">💡 提示模式</div>
                        )}
                        {msg.role === "assistant" && meta?.status === "confirming" && (
                          <div className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300 mb-1">✅ 理解确认</div>
                        )}
                        <Markdown text={msg.content} />
                        {msg.role === "assistant" && !msg._uiOnly && (
                          <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-[#DDE5EE] dark:border-slate-600">
                            <button onClick={() => handleFeedback(i, "up")}
                              className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                                feedbackMap[i] === "up"
                                  ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                                  : "text-[#8FA0B4] dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                              }`}>
                              👍
                            </button>
                            <button onClick={() => handleFeedback(i, "down")}
                              className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                                feedbackMap[i] === "down"
                                  ? "bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400"
                                  : "text-[#8FA0B4] dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400"
                              }`}>
                              👎
                            </button>
                          </div>
                        )}
                      </div>
                      {/* User avatar placeholder (right side) */}
                      {msg.role === "user" && (
                        <div className="w-7 h-7 rounded-full bg-[#E8ECF0] dark:bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 text-[#6B7F96] dark:text-slate-400">
                          👤
                        </div>
                      )}
                    </div>
                    );
                  })}
                  {streamingText !== null && (
                    <div className="flex gap-2 justify-start">
                      <div className="w-7 h-7 rounded-full bg-[#1B4F8A] dark:bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">⚡</div>
                      <div className="bg-[#F5F8FC] dark:bg-slate-800 border border-[#DDE5EE] dark:border-slate-700 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed text-[#3D5166] dark:text-slate-300 max-w-[80%]">
                        <Markdown text={streamingText} />
                        <span className="inline-block w-1.5 h-4 bg-[#1B4F8A] dark:bg-blue-400 ml-0.5 animate-pulse align-middle" />
                      </div>
                    </div>
                  )}
                  {(sending || introGenerating) && streamingText === null && (
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
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => setIsComposing(false)}
                    onKeyDown={(e)=>{if(e.key==="Enter"&&!e.shiftKey&&!isComposing){e.preventDefault();handleSend();}}}
                    placeholder="输入你的分析...（Enter 发送，Shift+Enter 换行）" rows={4} disabled={sending || introGenerating}
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-[#C5D3E0] dark:border-slate-600 rounded-lg text-sm text-[#1A2332] dark:text-slate-100 placeholder-[#8FA0B4] dark:placeholder-slate-500 focus:outline-none focus:border-[#1B4F8A] dark:focus:border-blue-400 resize-none" />
                  <button onClick={handleSend} disabled={sending || introGenerating || !input.trim()} className="btn-primary self-end text-sm px-4">发送</button>
                </div>
                {/* Quick action buttons */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <button onClick={handleHint} disabled={sending}
                    className="text-xs px-3 py-1.5 bg-[#FEF3E2] dark:bg-amber-900/20 text-[#854F0B] dark:text-amber-300 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-40">
                    💡 给我提示
                  </button>
                  <button onClick={handleRestart} disabled={sending}
                    className="text-xs px-3 py-1.5 bg-[#F5F8FC] dark:bg-slate-800 text-[#6B7F96] dark:text-slate-400 rounded-full hover:bg-[#E8ECF0] dark:hover:bg-slate-700 transition-colors disabled:opacity-40">
                    🔄 重新开始
                  </button>
                  <button onClick={handleEvaluate} disabled={sending || messages.length < 3}
                    className="text-xs px-3 py-1.5 bg-[#EDE9FB] dark:bg-purple-900/20 text-[#4C3D9E] dark:text-purple-300 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors disabled:opacity-40">
                    📊 评估我
                  </button>
                  <button onClick={handleCopyConversation} disabled={messages.length < 2}
                    className="text-xs px-3 py-1.5 bg-[#E8F4F0] dark:bg-emerald-900/20 text-[#0F6E56] dark:text-emerald-300 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-40">
                    {copied ? "✅ 已复制" : "📋 复制对话"}
                  </button>
                </div>
                {/* Action buttons */}
                {figures.length > 0 && figIdx < figures.length - 1 && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#E8ECF0] dark:border-slate-700">
                    <span className="text-xs text-[#8FA0B4] dark:text-slate-500">分析完当前步骤后：</span>
                    <button onClick={handleNextFigure} disabled={introGenerating} className="text-xs px-3 py-1 bg-[#EBF2FA] dark:bg-slate-700 text-[#1B4F8A] dark:text-blue-400 rounded-lg hover:bg-[#1B4F8A] dark:hover:bg-blue-600 hover:text-white transition-colors">
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
      {/* Image lightbox */}
      {lightboxImg && (
        <div onClick={() => setLightboxImg(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <button onClick={() => setLightboxImg(null)}
            className="absolute top-4 right-4 text-white text-3xl w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >✕</button>
          <img src={lightboxImg} alt="放大查看"
            loading="lazy"
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </AppLayout>
  );
}
