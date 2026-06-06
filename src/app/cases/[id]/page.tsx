"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import HeartModel from "@/components/HeartModel";
import { caseService, chatService, progressService } from "@/lib/services";
import type { CaseInput } from "@/lib/services";
import { ROUTES } from "@/lib/routes";

interface Case {
  id: string; title: string; category: string; difficulty: string;
  description: string; ecg_findings: string[]; question: string;
  hint: string; key_points: string[]; is_published: boolean;
  mapping_system?: string;
}
interface Message { role: "user" | "assistant" | "system"; content: string; }

const catColors: Record<string, string> = {
  SVT: "bg-[#EBF2FA] text-[#1B4F8A]", VT: "bg-[#FDE8E8] text-[#9B2C2C]",
  AF: "bg-[#FEF3E2] text-[#854F0B]", AFL: "bg-[#EDE9FB] text-[#4C3D9E]",
};
const diffColors: Record<string, string> = {
  "基础": "bg-[#E8F4F0] text-[#0F6E56]", "进阶": "bg-[#FEF3E2] text-[#854F0B]", "高级": "bg-[#FDE8E8] text-[#9B2C2C]",
};

const stepLabels = [
  { num: 1, title: "病史与体表 ECG", icon: "📋" },
  { num: 2, title: "导管放置与腔内电图", icon: "🫀" },
  { num: 3, title: "电生理检查与程序刺激", icon: "⚡" },
  { num: 4, title: "AI 苏格拉底对话", icon: "🤖" },
  { num: 5, title: "消融策略与结果", icon: "🎯" },
  { num: 6, title: "关键知识点总结", icon: "📚" },
];

export default function CaseDetailPage() {
  const params = useParams(); const caseId = params.id as string;
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [relatedCases, setRelatedCases] = useState<Case[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [diagnosisRevealed, setDiagnosisRevealed] = useState(false);
  const [quota, setQuota] = useState<{ remaining: number; total: number } | null>(null);
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([caseService.getCaseById(caseId), caseService.getCases()]).then(([c, all]) => {
      setCaseData(c);
      setRelatedCases(all.filter((r) => r.id !== caseId && r.category === c.category).slice(0, 3));
      setLoading(false);
    });
    progressService.getQuota().then((d) => {
      if (d.total) { setQuota({ remaining: d.remaining, total: d.total }); if (d.remaining === 0) setQuotaExhausted(true); }
      // 999 total = registered user (unlimited)
      if (d.total >= 999) setLoggedIn(true);
    }).catch(() => {});
  }, [caseId]);

  const startAITutor = () => {
    if (!caseData) return;
    setActiveStep(3); // jump to step 4
    setMessages([{
      role: "assistant",
      content: `欢迎来到电生理导管室。\n\n这里没有考试，只有探索。每一个错误推理，都是通往正确答案的必经路径。\n\n今日病例：**${caseData.title}**\n\n${caseData.question}\n\n💡 提示：${caseData.hint}\n\n请大胆分享你的分析——说错了也没关系。`,
    }]);
  };

  const handleSend = async () => {
    if (!input.trim() || sending || !caseData) return;
    const userMessage: Message = { role: "user" as const, content: input };
    setMessages((p) => [...p, userMessage]); setInput(""); setSending(true);
    try {
      const rawReply = await chatService.sendMessageStream([...messages, userMessage].slice(-10), caseData as CaseInput, caseId, () => {});
      let displayContent = rawReply;
      try { const p = JSON.parse(rawReply); displayContent = (p.content || rawReply) + (p.hint ? "\n\n💡 提示：" + p.hint : ""); } catch {}
      setMessages((p) => [...p, { role: "assistant", content: displayContent }]);
      if (quota !== null) setQuota((q) => q ? { ...q, remaining: q.remaining - 1 } : null);
    } catch (err: unknown) {
      const msg = (err as Error).message || "";
      if (msg.includes("429") || msg.includes("上限")) setQuotaExhausted(true);
      setMessages((p) => [...p, { role: "assistant", content: `抱歉：${msg || "AI 导师暂时不可用"}` }]);
    } finally { setSending(false); }
  };

  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, [messages]);

  if (loading) return <AppLayout><div className="max-w-4xl mx-auto px-4 py-12 text-center text-[#6B7F96]">标测信号中...</div></AppLayout>;
  if (!caseData) return <AppLayout><div className="max-w-4xl mx-auto px-4 py-12 text-center text-[#6B7F96]">病例未找到</div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="card mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`badge-category ${catColors[caseData.category]||""}`}>{caseData.category}</span>
            <span className={`badge-difficulty ${diffColors[caseData.difficulty]||""}`}>{caseData.difficulty}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A2332] mb-3 font-serif">{caseData.title}</h1>
          <p className="text-[#6B7F96]">{caseData.description}</p>

          {/* ── Diagnosis: hidden until revealed ─────────────── */}
          {!diagnosisRevealed ? (
            <button
              onClick={() => setDiagnosisRevealed(true)}
              className="mt-4 text-sm text-[#1B4F8A] hover:text-[#154070] font-medium border border-dashed border-[#1B4F8A]/30 rounded-lg px-4 py-2 hover:bg-[#EBF2FA] transition-colors"
            >
              🔒 点击查看诊断结论（建议先自行分析）
            </button>
          ) : (
            <div className="mt-4 bg-[#F5F8FC] border border-[#DDE5EE] rounded-lg p-4">
              <p className="text-sm font-medium text-[#1A2332] mb-1">诊断：{caseData.category} — {caseData.difficulty}级别</p>
              <p className="text-xs text-[#6B7F96]">
                {caseData.key_points?.join(" · ") || "暂无详细诊断记录"}
              </p>
            </div>
          )}
        </div>

        {/* ── Step Progress ──────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {stepLabels.map((s, i) => (
            <button
              key={s.num}
              onClick={() => setActiveStep(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0 ${
                activeStep === i
                  ? "bg-[#1B4F8A] text-white"
                  : i < activeStep
                  ? "bg-[#E8F4F0] text-[#0F6E56]"
                  : "bg-[#F5F8FC] text-[#6B7F96] hover:bg-[#EBF2FA]"
              }`}
            >
              <span>{s.icon}</span>
              <span className="hidden sm:inline">Step {s.num}: {s.title}</span>
              <span className="sm:hidden">{s.num}</span>
            </button>
          ))}
        </div>

        {/* ── Step Content ───────────────────────────────────── */}
        {activeStep === 0 && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold text-[#1A2332] mb-4 font-serif">📋 病史与体表 ECG</h2>
            <div className="text-sm text-[#3D5166] space-y-3">
              <p>{caseData.description}</p>
              {caseData.ecg_findings && caseData.ecg_findings.length > 0 && (
                <div>
                  <h4 className="font-medium text-[#1A2332] mb-1">体表心电图发现</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {caseData.ecg_findings.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
              )}
              <div className="bg-[#F5F8FC] border border-[#DDE5EE] rounded-lg p-4 mt-4">
                <p className="text-[#6B7F96] text-xs mb-1">🤔 先自己分析，再点击下方按钮查看 AI 引导</p>
                <button onClick={startAITutor} className="text-sm text-[#1B4F8A] font-medium hover:underline">
                  让 AI 导师引导我分析 →
                </button>
              </div>
            </div>
          </div>
        )}

        {activeStep === 1 && (
          <div className="space-y-6 mb-6">
            <div className="card">
              <h2 className="text-xl font-semibold text-[#1A2332] mb-4 font-serif">🫀 导管放置与腔内电图</h2>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div className="bg-[#F5F8FC] rounded-lg p-4 text-center">
                  <div className="text-4xl mb-2">🫀</div>
                  <p className="text-xs text-[#6B7F96]">HRA · HIS · CS · RV 导管位置示意</p>
                  <p className="text-xs text-[#8FA0B4] mt-1">（腔内图占位 — 后续替换为 SVG/图片）</p>
                </div>
                <div className="bg-[#F5F8FC] rounded-lg p-4 text-center">
                  <div className="text-4xl mb-2">📊</div>
                  <p className="text-xs text-[#6B7F96]">标准四腔 EGM 记录</p>
                  <p className="text-xs text-[#8FA0B4] mt-1">HRA d 3-4 · His p 3-4 · CS 9,10 → 1,2 · RVa 3-4</p>
                </div>
              </div>
              <button onClick={() => { startAITutor(); }} className="text-sm text-[#1B4F8A] font-medium hover:underline">
                继续让 AI 导师引导分析 →
              </button>
            </div>

            {/* 3D Heart Model */}
            <HeartModel className="shadow-lg" />
          </div>
        )}

        {activeStep === 2 && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold text-[#1A2332] mb-4 font-serif">⚡ 电生理检查与程序刺激</h2>
            <div className="bg-[#F5F8FC] rounded-lg p-4 mb-4 text-center">
              <div className="text-4xl mb-2">⚡</div>
              <p className="text-xs text-[#6B7F96]">S1S1 / S1S2 程序刺激结果</p>
              <p className="text-xs text-[#8FA0B4] mt-1">（刺激协议与诱发结果占位 — 后续接入可视化）</p>
            </div>
            <button onClick={() => { startAITutor(); }} className="text-sm text-[#1B4F8A] font-medium hover:underline">
              进入 AI 苏格拉底对话 →
            </button>
          </div>
        )}

        {activeStep === 3 && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold text-[#1A2332] mb-4 font-serif">🤖 AI 苏格拉底对话</h2>

            {/* Quota bar */}
            {quota !== null && (
              <div className={`flex items-center justify-between mb-4 text-xs px-3 py-2 rounded-lg ${
                quota.remaining <= 5 && quota.remaining > 0 ? "bg-[#FEF3E2] text-[#854F0B]"
                : quota.remaining === 0 ? "bg-[#FDE8E8] text-[#9B2C2C]" : "bg-[#F5F8FC] text-[#6B7F96]"
              }`}>
                <span>今日剩余 {quota.remaining} 次对话{quota.remaining <= 5 && quota.remaining > 0 && " ⚠️"}</span>
                {quota.remaining === 0 && (
                    loggedIn ? <a href="/upgrade" className="font-medium text-[#1B4F8A] hover:underline">升级会员 →</a>
                    : <a href="/auth?register=1" className="font-medium text-[#1B4F8A] hover:underline">免费注册 →</a>
                  )}
              </div>
            )}
            {quotaExhausted && (
              <div className="mb-4 text-center">
                <p className="text-sm text-[#9B2C2C] mb-2">今日免费次数已用完</p>
                {loggedIn ? (
                  <a href="/upgrade" className="text-sm text-[#1B4F8A] hover:underline">升级会员，无限对话 →</a>
                ) : (
                  <a href="/auth?register=1" className="text-sm text-[#1B4F8A] hover:underline">免费注册，无限对话 →</a>
                )}
              </div>
            )}

            {/* EGM viewer + Chat */}
            <div className="grid lg:grid-cols-5 gap-4">
              {/* EGM panel — left on desktop, top on mobile */}
              <div className="lg:col-span-2 order-1 lg:order-1">
                <div className="bg-[#0a0e1a] border border-[#334155] rounded-lg overflow-hidden sticky top-20">
                  {/* EGM header */}
                  <div className="flex items-center justify-between px-3 py-2 bg-[#111827] border-b border-[#1e293b]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                    </div>
                    <span className="text-xs text-slate-400">EGM Viewer · 25 mm/s</span>
                    <div className="w-12" />
                  </div>
                  {/* Lead list */}
                  <div className="p-2 space-y-1 text-xs font-mono">
                    {["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V6",
                      "HRA d", "HIS p", "CS 9-10", "CS 1-2", "RVa d"].map((lead) => (
                      <div key={lead} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#1e293b] cursor-pointer group">
                        <span className="text-slate-500 w-12 shrink-0">{lead}</span>
                        <div className="flex-1 h-4 bg-[#1e293b] rounded-sm relative overflow-hidden">
                          <div className="absolute inset-0 opacity-30">
                            <svg viewBox="0 0 200 16" className="w-full h-full">
                              <polyline points="0,8 20,8 22,3 28,12 32,8 40,8 42,2 48,13 52,8 200,8" fill="none" stroke="#60a5fa" strokeWidth="0.5" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Controls */}
                  <div className="flex items-center gap-3 px-3 py-2 bg-[#111827] border-t border-[#1e293b]">
                    <button className="w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center text-xs" title="快退">⏮</button>
                    <button className="w-8 h-8 rounded-full bg-[#1B4F8A] hover:bg-[#154070] text-white flex items-center justify-center text-sm" title="播放">▶</button>
                    <button className="w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center text-xs" title="快进">⏭</button>
                    <div className="flex-1 h-1 bg-slate-700 rounded-full relative cursor-pointer">
                      <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-[#1B4F8A] rounded-full" />
                      <div className="absolute left-1/3 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow" />
                    </div>
                    <span className="text-xs text-slate-400 font-mono">0:42 / 2:15</span>
                    <button className="text-xs text-slate-400 hover:text-white" title="测量">📏</button>
                  </div>
                </div>
              </div>

              {/* Chat panel — right on desktop, below on mobile */}
              <div className="lg:col-span-3 order-2">
                <div ref={chatRef} className="h-[350px] sm:h-[400px] overflow-y-auto mb-4 space-y-3 pr-2">
                  {messages.length === 0 && (
                    <div className="text-center py-12 text-[#8FA0B4]">
                      <p className="text-lg mb-2">🤖</p>
                      <p className="text-sm">AI 导师已就绪</p>
                      <p className="text-xs mt-1">输入你的分析，开始苏格拉底式对话</p>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role==="user"?"justify-end":"justify-start"}`}>
                      <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${msg.role==="user"?"bg-[#1B4F8A] text-white":"bg-[#F5F8FC] text-[#3D5166]"}`}>
                        {msg.content.split("\n").map((l,j)=><span key={j}>{l}{j<msg.content.split("\n").length-1&&<br/>}</span>)}
                      </div>
                    </div>
                  ))}
                  {sending && <div className="flex justify-start"><div className="bg-[#F5F8FC] text-[#8FA0B4] rounded-xl px-4 py-3 text-sm">AI 导师思考中...</div></div>}
                </div>
                {/* Action buttons */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={async () => {
                      if (sending || !caseData) return;
                      setSending(true);
                      try {
                        const reply = await chatService.sendMessage(
                          [...messages, { role: "user" as const, content: "我需要提示，请给我更具体的观察方向" }].slice(-10),
                          caseData as CaseInput, caseId
                        );
                        let display = reply.reply;
                        try { const p = JSON.parse(reply.reply); display = (p.content||reply.reply)+(p.hint?"\n\n💡 提示："+p.hint:""); } catch {}
                        setMessages((p) => [...p, { role: "assistant", content: "💡 " + display }]);
                        if (quota !== null) setQuota((q) => q ? { ...q, remaining: q.remaining - 1 } : null);
                      } catch { /* ignore */ }
                      finally { setSending(false); }
                    }}
                    disabled={sending || quotaExhausted || messages.length === 0}
                    className="text-xs px-3 py-1.5 border border-[#C5D3E0] rounded-lg text-[#4B6080] hover:border-[#1B4F8A] hover:text-[#1B4F8A] transition-colors disabled:opacity-40 shrink-0"
                    title="AI 给出更具体的观察方向"
                  >
                    💡 提示
                  </button>
                  <button
                    onClick={() => {
                      if (!caseData) return;
                      setMessages((p) => [
                        ...p,
                        { role: "assistant" as const, content: "好的，我们进入下一个观察点。" + caseData.question },
                      ]);
                    }}
                    disabled={sending || quotaExhausted}
                    className="text-xs px-3 py-1.5 border border-[#C5D3E0] rounded-lg text-[#4B6080] hover:border-[#1B4F8A] hover:text-[#1B4F8A] transition-colors disabled:opacity-40 shrink-0"
                    title="跳过当前步骤，进入下一步"
                  >
                    ⏭ 跳过
                  </button>
                  <div className="flex-1" />
                  <span className="text-xs text-[#8FA0B4]">
                    {messages.length > 0 ? `${messages.length} 条消息` : ""}
                  </span>
                </div>

                <div className="flex gap-2 sm:gap-3">
                  <textarea value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}}} placeholder={quotaExhausted ? "今日次数已用完" : "输入你的分析，按 Enter 发送..."} rows={2} disabled={sending || quotaExhausted} className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-[#C5D3E0] rounded-lg text-sm text-[#1A2332] placeholder-[#8FA0B4] focus:outline-none focus:border-[#1B4F8A] resize-none disabled:bg-gray-100" />
                  <button onClick={handleSend} disabled={sending||!input.trim()||quotaExhausted} className="btn-primary self-end disabled:opacity-50 text-sm px-4">发送</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeStep === 4 && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold text-[#1A2332] mb-4 font-serif">🎯 消融策略与结果</h2>
            <div className="bg-[#F5F8FC] rounded-lg p-4 text-center mb-4">
              <div className="text-4xl mb-2">🎯</div>
              <p className="text-sm text-[#6B7F96]">消融靶点定位 · 能量设置 · 终点验证 · 异丙肾激发</p>
              <p className="text-xs text-[#8FA0B4] mt-1">（消融数据占位 — 后续接入真实手术记录）</p>
            </div>
            <button onClick={startAITutor} className="text-sm text-[#1B4F8A] font-medium hover:underline">
              🤖 与 AI 讨论消融策略 →
            </button>
          </div>
        )}

        {activeStep === 5 && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold text-[#1A2332] mb-4 font-serif">📚 关键知识点总结</h2>
            <ul className="space-y-2">
              {caseData.key_points?.map((kp, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#3D5166]">
                  <span className="text-[#1B4F8A] font-bold mt-0.5">{i + 1}.</span>
                  <span>{kp}</span>
                </li>
              ))}
              {(!caseData.key_points || caseData.key_points.length === 0) && (
                <p className="text-[#8FA0B4] text-sm">暂无知识点记录</p>
              )}
            </ul>
            <div className="mt-6 p-4 bg-[#EBF2FA] border border-[#1B4F8A]/20 rounded-lg text-center">
              <p className="text-sm text-[#1B4F8A]">
                🎉 恭喜完成本病例学习！
              </p>
              <p className="text-xs text-[#6B7F96] mt-1">去个人中心查看学习记录</p>
            </div>
          </div>
        )}

        {/* ── Related Cases ──────────────────────────────────── */}
        {relatedCases.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-[#1A2332] mb-4 font-serif">相关病例推荐</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {relatedCases.map((rc) => (
                <Link key={rc.id} href={ROUTES.CASE_DETAIL(rc.id)} className="card group">
                  <span className={`badge-category ${catColors[rc.category]||""} mb-2 inline-block`}>{rc.category}</span>
                  <h4 className="text-sm font-medium text-[#1A2332] group-hover:text-[#1B4F8A] transition-colors line-clamp-2 font-serif">{rc.title}</h4>
                  <p className="text-xs text-[#8FA0B4] mt-1">{rc.difficulty}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
