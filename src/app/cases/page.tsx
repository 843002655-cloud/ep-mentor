"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { caseService, authService } from "@/lib/services";
import { SkeletonPage } from "@/components/Skeleton";
import CaseCardThumb from "@/components/CaseCardThumb";
import EmptyState from "@/components/EmptyState";
import { ROUTES } from "@/lib/routes";
import { usePageTitle } from "@/lib/hooks/usePageTitle";
import { formatSource } from "@/lib/source-utils";

interface Case {
  id: string; title: string; category: string; difficulty: string;
  description: string; ecg_findings: string[]; question: string;
  hint: string; key_points: string[]; is_published: boolean;
  mapping_system?: string; content_json?: Record<string, unknown>;
}

const categories = [
  { value: "", label: "全部" }, { value: "SVT", label: "SVT" },
  { value: "VT", label: "VT" }, { value: "AF", label: "AF及AFL" },
];

const difficulties = [
  { value: "", label: "全部难度" }, { value: "基础", label: "基础" },
  { value: "进阶", label: "进阶" }, { value: "高级", label: "高级" },
];

const catColors: Record<string, string> = {
  SVT: "bg-[#EBF2FA] text-[#1B4F8A] dark:bg-blue-900/30 dark:text-blue-300",
  VT: "bg-[#FDE8E8] text-[#9B2C2C] dark:bg-red-900/30 dark:text-red-300",
  AF: "bg-[#FEF3E2] text-[#854F0B] dark:bg-amber-900/30 dark:text-amber-300",
};

const diffColors: Record<string, string> = {
  "基础": "bg-[#E8F4F0] text-[#0F6E56] dark:bg-emerald-900/30 dark:text-emerald-300",
  "进阶": "bg-[#FEF3E2] text-[#854F0B] dark:bg-amber-900/30 dark:text-amber-300",
  "高级": "bg-[#FDE8E8] text-[#9B2C2C] dark:bg-red-900/30 dark:text-red-300",
};

function keywordMatch(c: Case, kw: string): boolean {
  if (!kw) return true;
  const lower = kw.toLowerCase();
  const haystack = [
    c.title, c.description, c.question, c.hint,
    ...(c.ecg_findings || []), ...(c.key_points || []),
  ].join(" ").toLowerCase();
  return haystack.includes(lower);
}

const FilterBtn = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors border whitespace-nowrap shrink-0 ${active ? "bg-[#1B4F8A] dark:bg-blue-600 text-white border-[#1B4F8A] dark:border-blue-600" : "bg-white dark:bg-slate-800 text-[#4B6080] dark:text-slate-300 border-[#C5D3E0] dark:border-slate-600 hover:border-[#1B4F8A] dark:hover:border-blue-400 hover:text-[#1B4F8A] dark:hover:text-blue-400"}`}>{active && "✓ "}{children}</button>
);

function CaseList() {
  const searchParams = useSearchParams();
  const [allCases, setAllCases] = useState<Case[]>([]);
  const [learnerCounts, setLearnerCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [difficulty, setDifficulty] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => { setLoggedIn(authService.isLoggedIn()); }, []);
  useEffect(() => {
    caseService.getCases()
      .then(({ cases, learnerCounts: lc }) => {
        setAllCases(cases);
        setLearnerCounts(lc);
      })
      .catch(() => setLoadError("加载病例失败，请刷新重试"))
      .finally(() => setLoading(false));
  }, []);

  // Dynamically compute counts from actual cases
  const totalCount = allCases.length;
  const catCounts: Record<string, number> = {};
  for (const c of allCases) {
    catCounts[c.category] = (catCounts[c.category] || 0) + 1;
  }
  const getCatCount = (catValue: string) => {
    if (!catValue) return totalCount;
    if (catValue === "AF") return (catCounts["AF"] || 0) + (catCounts["AFL"] || 0);
    return catCounts[catValue] || 0;
  };

  const filtered = allCases.filter((c) => {
    if (category && c.category !== category) return false;
    if (difficulty && c.difficulty !== difficulty) return false;
    if (!keywordMatch(c, keyword)) return false;
    return true;
  });

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-3xl font-bold text-[#1A2332] dark:text-slate-100 mb-2 font-serif">病例库</h1>
        <p className="text-[#6B7F96] dark:text-slate-400 mb-3">从 SVT 鉴别到室速标测，AI 导师引导你像专家一样思考每一个决策点</p>
        <p className="text-xs text-[#8FA0B4] dark:text-slate-500 mb-4 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>⚡ {totalCount} 精选案例</span><span className="text-[#C5D3E0] dark:text-slate-600">|</span>
          <span>🎯 覆盖 SVT / VT / AF及AFL</span><span className="text-[#C5D3E0] dark:text-slate-600">|</span>
          <span>👨‍⚕️ AI 苏格拉底式教学</span>
        </p>

        {!loggedIn && (
          <div className="mb-6 sm:mb-8 px-4 py-3 rounded-xl border border-[#1B4F8A]/20 dark:border-blue-400/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-[#EBF2FA] dark:bg-slate-700">
            <span className="text-sm text-[#1A2332] dark:text-slate-100">🎓 免费注册即可与 AI 导师对话，开始学习</span>
            <a href={ROUTES.AUTH_REGISTER} className="text-sm font-medium text-[#1B4F8A] dark:text-blue-400 hover:text-[#154070] dark:hover:text-blue-300 transition-colors whitespace-nowrap self-end sm:self-auto">立即注册 →</a>
          </div>
        )}

        {/* Filters — rows on mobile, scrollable */}
        <div className="space-y-3 mb-6 sm:mb-8">
          {/* Keyword search */}
          <div className="relative max-w-sm">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="🔍 搜索病例标题、关键词..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-[#C5D3E0] dark:border-slate-600 rounded-lg text-sm text-[#1A2332] dark:text-slate-100 placeholder-[#8FA0B4] dark:placeholder-slate-500 focus:outline-none focus:border-[#1B4F8A] dark:focus:border-blue-400 transition-colors"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8FA0B4]">🔍</span>
          </div>

          {/* Filter bars */}
          <div className="filter-bar sm:flex-wrap sm:overflow-visible items-center">
            {categories.map((c) => <FilterBtn key={c.value} active={category===c.value} onClick={()=>setCategory(c.value)}>{c.label} ({getCatCount(c.value)})</FilterBtn>)}
            <div className="w-px bg-[#E8ECF0] dark:bg-slate-700 mx-1 sm:mx-2 h-6 shrink-0 hidden sm:block" />
            {difficulties.map((d) => <FilterBtn key={d.value} active={difficulty===d.value} onClick={()=>setDifficulty(d.value)}>{d.label}</FilterBtn>)}
          </div>
        </div>

        {loadError ? (
          <EmptyState icon="⚠️" title="加载失败" description={loadError} actionHref={ROUTES.CASES} actionLabel="返回病例库" />
        ) : loading ? <SkeletonPage variant="case" count={6} /> : filtered.length===0 ? <EmptyState icon="🔍" title={keyword ? "未找到匹配的病例" : "暂无病例"} description={keyword ? "换个关键词试试？" : "病例库还没有内容，请稍后再来"} actionHref={keyword ? "" : ROUTES.CASES} actionLabel={keyword ? "" : "刷新页面"} /> : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((c) => (
              <Link
                key={c.id}
                href={ROUTES.CASE_DETAIL(c.id)}
                className="card group flex flex-col cursor-pointer hover:border-[#1B4F8A] dark:hover:border-blue-400 transition-colors"
              >
                <CaseCardThumb category={c.category} />

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`badge-category ${catColors[c.category]||""}`}>{c.category}</span>
                    <span className={`badge-difficulty ${diffColors[c.difficulty]||""}`}>{c.difficulty}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-[#1A2332] dark:text-slate-100 mb-2 font-serif group-hover:text-[#1B4F8A] dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                    {c.title}
                  </h3>
                  <p className="text-sm text-[#6B7F96] dark:text-slate-400 mb-2" style={{display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
                    {c.description}
                  </p>
                  {c.content_json?.source ? <p className="text-xs text-[#8FA0B4] dark:text-slate-500 mb-2 line-clamp-1">📖 {formatSource(c.content_json.source as string)}</p> : null}

                  {/* Key clinical info */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {c.key_points?.slice(0, 2).map((kp, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded bg-[#F5F8FC] dark:bg-slate-800 text-[#6B7F96] dark:text-slate-400">{kp}</span>
                    ))}
                  </div>

                  <div className="flex items-center text-xs text-[#8FA0B4] dark:text-slate-500 mb-4">
                    <span className="flex items-center gap-1"><span>👥</span><span>{learnerCounts[c.id] || 0} 人已学习</span></span>
                  </div>
                </div>

                <span className="block w-full text-center py-2.5 rounded-[10px] text-white text-sm font-medium bg-[#1B4F8A] dark:bg-blue-600 group-hover:bg-[#154070] dark:group-hover:bg-blue-500 transition-all duration-200">
                  AI 导师带你分析 →
                </span>
              </Link>
            ))}
          </div>
        }
      </div>
    </AppLayout>
  );
}

export default function CasesPage() {
  usePageTitle("病例库");
  return <Suspense fallback={<SkeletonPage variant="case" count={6} />}><CaseList /></Suspense>;
}
