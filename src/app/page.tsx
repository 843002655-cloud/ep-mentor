"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import Typewriter from "@/components/Typewriter";
import CaseCardThumb from "@/components/CaseCardThumb";
import EcgBackground from "@/components/EcgBackground";
import { ROUTES } from "@/lib/routes";
import { caseService } from "@/lib/services";
import { usePageTitle } from "@/lib/hooks/usePageTitle";

// ── Hero AI Demo ───────────────────────────────────────────────────

const aiDemoLines = [
  'AI：这份 EGM 中，His 束电位在哪里？',
  '医生：在 A 波和 V 波之间？',
  'AI：很好。那冠状窦近端和远端的激动顺序提示什么？',
  '医生：CS 9-10 的 A 波最早，是左侧旁路？',
  'AI：正确。为什么不是 AVNRT？关键证据在哪？',
];

// ── Features ───────────────────────────────────────────────────────

const features = [
  {
    icon: "🧠",
    title: "苏格拉底式 AI 教学",
    desc: "不是直接给答案，而是通过连续提问引导你自己推导诊断 —— 就像资深术者在导管室教你那样。",
  },
  {
    icon: "📊",
    title: "真实腔内电图解析",
    desc: "基于真实病例的 EGM / 标测图，同步体表 ECG 逐帧分析激动顺序和折返机制。",
  },
  {
    icon: "🫀",
    title: "3D 心脏解剖模型",
    desc: "交互式三维心脏模型，直观理解心腔结构和消融靶点空间关系。",
  },
  {
    icon: "🏥",
    title: "分级学习路径",
    desc: "从 SVT 基础到房颤 / 室速高级，按你的年资和水平精准匹配内容难度。",
  },
];

// ── Learning Path ──────────────────────────────────────────────────

const learningPath = [
  {
    role: "住院医 / 进修生",
    phase: "Phase 1",
    desc: "心电图基础 · 窄/宽 QRS 鉴别 · SVT 机制",
    cases: 12,
    color: "border-[#0F6E56]",
    bg: "bg-[#E8F4F0]",
    text: "text-[#0F6E56]",
  },
  {
    role: "初级术者",
    phase: "Phase 2",
    desc: "SVT 消融 · 典型房扑 CTI · 房间隔穿刺",
    cases: 18,
    color: "border-[#1B4F8A]",
    bg: "bg-[#EBF2FA]",
    text: "text-[#1B4F8A]",
  },
  {
    role: "中级术者",
    phase: "Phase 3",
    desc: "房颤 PVI · 左房标测 · 复杂房扑",
    cases: 15,
    color: "border-[#854F0B]",
    bg: "bg-[#FEF3E2]",
    text: "text-[#854F0B]",
  },
  {
    role: "高级术者",
    phase: "Phase 4",
    desc: "室速基质消融 · 心外膜途径 · 先天性心脏病术后",
    cases: 10,
    color: "border-[#9B2C2C]",
    bg: "bg-[#FDE8E8]",
    text: "text-[#9B2C2C]",
  },
];

// ── Difficulty badge ───────────────────────────────────────────────

const diffBadge: Record<string, string> = {
  "基础": "bg-[#E8F4F0] text-[#0F6E56]",
  "进阶": "bg-[#FEF3E2] text-[#854F0B]",
  "高级": "bg-[#FDE8E8] text-[#9B2C2C]",
};

// ── Page ───────────────────────────────────────────────────────────

export default function Home() {
  usePageTitle("首页");
  const [featuredCases, setFeaturedCases] = useState<{ id: string; title: string; category: string; difficulty: string; description: string }[]>([]);
  const [allCasesCount, setAllCasesCount] = useState(0);
  const [diffCounts, setDiffCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    caseService.getCases().then(({ cases }) => {
      setFeaturedCases(cases.slice(0, 3));
      setAllCasesCount(cases.length);
      const dc: Record<string, number> = {};
      for (const c of cases) { dc[c.difficulty] = (dc[c.difficulty] || 0) + 1; }
      setDiffCounts(dc);
    }).catch(() => {});
  }, []);

  // Update learning path with real counts
  const learningPathLive = learningPath.map((p) => {
    let count = p.cases;
    if (p.phase === "Phase 1") count = diffCounts["基础"] || count;
    else if (p.phase === "Phase 2") count = diffCounts["进阶"] || count;
    else if (p.phase === "Phase 3" || p.phase === "Phase 4") count = (diffCounts["高级"] || 0) ? diffCounts["高级"] : count;
    return { ...p, cases: count };
  });

  return (
    <AppLayout>
      {/* ═══ Hero ═══ */}
      <section className="relative overflow-hidden bg-white dark:bg-slate-900 border-b border-[#E8ECF0] dark:border-slate-700">
        <EcgBackground />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left — Copy */}
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A2332] dark:text-slate-100 mb-4 leading-tight font-serif">
                <span className="text-[#1B4F8A] dark:text-blue-400">EP</span> Mentor
              </h1>
              <p className="text-xl sm:text-2xl text-[#6B7F96] dark:text-slate-400 mb-3 font-serif">
                心脏电生理 AI 导师
              </p>
              <p className="text-lg text-[#6B7F96] dark:text-slate-400 mb-8 leading-relaxed">
                通过苏格拉底式对话，像资深术者一样思考每一份 EGM
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <Link href={ROUTES.AUTH_REGISTER} className="bg-[#1B4F8A] dark:bg-blue-600 hover:bg-[#154070] dark:hover:bg-blue-500 text-white font-medium py-3 px-8 rounded-lg transition-colors text-center">
                  免费体验 AI 导师
                </Link>
                <Link href={ROUTES.CASES} className="border border-[#C5D3E0] dark:border-slate-600 text-[#4B6080] dark:text-slate-300 hover:border-[#1B4F8A] dark:hover:border-blue-400 hover:text-[#1B4F8A] dark:hover:text-blue-400 font-medium py-3 px-8 rounded-lg transition-colors text-center">
                  浏览病例库
                </Link>
              </div>

              <p className="text-sm text-[#8FA0B4] dark:text-slate-500 flex items-center gap-2 flex-wrap">
                <span>🏥 众多电生理医生已加入</span>
                <span className="text-[#C5D3E0] dark:text-slate-600 hidden sm:inline">·</span>
                <span className="hidden sm:inline">📋 {allCasesCount || ""} 精选病例</span>
                <span className="text-[#C5D3E0] dark:text-slate-600 hidden sm:inline">·</span>
                <span className="hidden sm:inline">🆓 每日 20 次免费对话</span>
              </p>
            </div>

            {/* Right — AI Demo */}
            <div className="bg-[#F5F8FC] dark:bg-slate-800 border border-[#DDE5EE] dark:border-slate-700 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E8ECF0] dark:border-slate-700">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="text-xs text-[#8FA0B4] dark:text-slate-500 ml-3">EP Mentor AI · 导管室模式</span>
              </div>
              <Typewriter
                texts={aiDemoLines}
                speed={35}
                pause={1800}
                className="text-sm leading-relaxed text-[#3D5166] dark:text-slate-300 font-mono min-h-[180px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Features ═══ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center text-[#1A2332] dark:text-slate-100 mb-4 font-serif">为什么选择 EP Mentor</h2>
        <p className="text-center text-[#6B7F96] dark:text-slate-400 mb-12 max-w-xl mx-auto">
          不只是题库 —— 而是一套完整的电生理思维训练系统
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div key={f.title} className="card group text-center sm:text-left">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold text-[#1A2332] dark:text-slate-100 mb-2 group-hover:text-[#1B4F8A] dark:group-hover:text-blue-400 transition-colors font-serif">{f.title}</h3>
              <p className="text-sm text-[#6B7F96] dark:text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Featured Cases ═══ */}
      {featuredCases.length > 0 && (
        <section className="bg-white dark:bg-slate-900 border-y border-[#E8ECF0] dark:border-slate-700 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold text-[#1A2332] dark:text-slate-100 mb-2 font-serif">精选病例预览</h2>
                <p className="text-[#6B7F96] dark:text-slate-400">AI 导师带你逐帧解析经典电生理案例</p>
              </div>
              <Link href={ROUTES.CASES} className="text-[#1B4F8A] dark:text-blue-400 hover:text-[#154070] dark:hover:text-blue-300 text-sm font-medium hidden sm:block">查看全部 →</Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {featuredCases.map((c) => (
                <Link
                  key={c.id || c.title}
                  href={ROUTES.CASE_DETAIL(c.id || "")}
                  className="card group flex flex-col"
                >
                  <CaseCardThumb category={c.category || "SVT"} />
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`badge-category ${diffBadge[c.difficulty] || diffBadge["基础"]}`}>
                      {c.difficulty}
                    </span>
                  </div>
                  <h3 className="font-semibold text-[#1A2332] dark:text-slate-100 mb-2 group-hover:text-[#1B4F8A] dark:group-hover:text-blue-400 transition-colors font-serif line-clamp-1">
                    {c.title}
                  </h3>
                  <p className="text-sm text-[#6B7F96] dark:text-slate-400 line-clamp-2 mb-4 flex-1">{c.description}</p>
                  <span className="text-sm text-[#1B4F8A] dark:text-blue-400 font-medium group-hover:underline">
                    AI 导师带你分析 →
                  </span>
                </Link>
              ))}
            </div>
            <div className="text-center mt-8 sm:hidden">
              <Link href={ROUTES.CASES} className="text-[#1B4F8A] dark:text-blue-400 text-sm">查看全部病例 →</Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══ Learning Path ═══ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center text-[#1A2332] dark:text-slate-100 mb-4 font-serif">学习路径</h2>
        <p className="text-center text-[#6B7F96] dark:text-slate-400 mb-12 max-w-xl mx-auto">
          从住院医到独立术者，每一步都有结构化的训练内容
        </p>
        <div className="relative">
          {/* Vertical line (desktop) */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-[#E8ECF0] dark:bg-slate-700 -translate-x-1/2" />
          <div className="space-y-8 lg:space-y-0">
            {learningPathLive.map((step, i) => (
              <div
                key={step.role}
                className={`relative lg:grid lg:grid-cols-2 lg:gap-12 items-center ${
                  i % 2 === 0 ? "" : "lg:[direction:rtl]"
                }`}
              >
                {/* Dot on timeline */}
                <div className="hidden lg:block absolute left-1/2 top-6 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-[#1B4F8A] dark:border-blue-400 -translate-x-1/2 z-10" />

                <div className={`${i % 2 === 0 ? "lg:text-right" : "lg:text-left"}`}>
                  <div
                    className={`card inline-block ${i % 2 !== 0 ? "lg:[direction:ltr]" : ""}`}
                  >
                    <span
                      className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-2 ${step.bg} ${step.text}`}
                    >
                      {step.phase}
                    </span>
                    <h3 className="text-lg font-semibold text-[#1A2332] dark:text-slate-100 font-serif">{step.role}</h3>
                    <p className="text-sm text-[#6B7F96] dark:text-slate-400 mt-1">{step.desc}</p>
                    <p className="text-xs text-[#8FA0B4] dark:text-slate-500 mt-2">{step.cases} 个病例</p>
                  </div>
                </div>
                <div className={i % 2 !== 0 ? "lg:[direction:ltr]" : ""} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Bottom CTA ═══ */}
      <section className="bg-[#1B4F8A] dark:bg-blue-600 py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4 font-serif">准备好提升你的电生理思维了吗？</h2>
          <p className="text-white/80 mb-8 text-lg">与同行一起，用苏格拉底的方式重新学习电生理</p>
          <Link href={ROUTES.AUTH_REGISTER} className="inline-block bg-white dark:bg-slate-100 text-[#1B4F8A] dark:text-blue-700 hover:bg-gray-100 dark:hover:bg-slate-200 font-bold py-3 px-10 rounded-lg transition-colors text-lg">
            免费开始 →
          </Link>
        </div>
      </section>
    </AppLayout>
  );
}
