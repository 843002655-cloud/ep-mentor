"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { caseService, authService } from "@/lib/services";
import { SkeletonPage } from "@/components/Skeleton";
import { ROUTES } from "@/lib/routes";

interface Case {
  id: string; title: string; category: string; difficulty: string;
  description: string; ecg_findings: string[]; question: string;
  hint: string; key_points: string[]; is_published: boolean;
  mapping_system?: string;
}

const categories = [
  { value: "", label: "全部" }, { value: "SVT", label: "SVT" },
  { value: "VT", label: "VT" }, { value: "AF", label: "AF" }, { value: "AFL", label: "AFL" },
];

const difficulties = [
  { value: "", label: "全部难度" }, { value: "基础", label: "基础" },
  { value: "进阶", label: "进阶" }, { value: "高级", label: "高级" },
];

const qrsTypes = [
  { value: "", label: "全部" }, { value: "narrow", label: "窄QRS" },
  { value: "wide", label: "宽QRS" }, { value: "flutter", label: "房扑波" },
];

const mappingSystems = [
  { value: "", label: "全部标测系统" },
  { value: "Carto", label: "Carto" },
  { value: "Ensite", label: "EnSite" },
  { value: "Rhythmia", label: "Rhythmia" },
  { value: "Other", label: "其他" },
];

const catColors: Record<string, string> = {
  SVT: "bg-[#EBF2FA] text-[#1B4F8A] dark:bg-blue-900/30 dark:text-blue-300",
  VT: "bg-[#FDE8E8] text-[#9B2C2C] dark:bg-red-900/30 dark:text-red-300",
  AF: "bg-[#FEF3E2] text-[#854F0B] dark:bg-amber-900/30 dark:text-amber-300",
  AFL: "bg-[#EDE9FB] text-[#4C3D9E] dark:bg-purple-900/30 dark:text-purple-300",
};

const diffColors: Record<string, string> = {
  "基础": "bg-[#E8F4F0] text-[#0F6E56] dark:bg-emerald-900/30 dark:text-emerald-300",
  "进阶": "bg-[#FEF3E2] text-[#854F0B] dark:bg-amber-900/30 dark:text-amber-300",
  "高级": "bg-[#FDE8E8] text-[#9B2C2C] dark:bg-red-900/30 dark:text-red-300",
};

const studyTime: Record<string, string> = { "基础": "15 分钟", "进阶": "25 分钟", "高级": "40 分钟" };

function matchQrs(findings: string[], q: string): boolean {
  if (!q) return true;
  if (q === "narrow") return findings.some((f) => f.includes("窄QRS") || f.includes("窄 QRS"));
  if (q === "wide") return findings.some((f) => f.includes("宽QRS") || f.includes("宽 QRS"));
  if (q === "flutter") return findings.some((f) => f.includes("flutter") || f.includes("扑动") || f.includes("AFL"));
  return true;
}

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
  const searchParams = useSearchParams(); const router = useRouter();
  const [allCases, setAllCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [difficulty, setDifficulty] = useState("");
  const [qrsType, setQrsType] = useState("");
  const [mapping, setMapping] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => { setLoggedIn(authService.isLoggedIn()); }, []);
  useEffect(() => {
    caseService.getCases({ mapping_system: mapping || undefined }).then((c) => { setAllCases(c); setLoading(false); });
  }, [mapping]);

  const filtered = allCases.filter((c) => {
    if (category && c.category !== category) return false;
    if (difficulty && c.difficulty !== difficulty) return false;
    if (!matchQrs(c.ecg_findings || [], qrsType)) return false;
    if (!keywordMatch(c, keyword)) return false;
    return true;
  });

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-3xl font-bold text-[#1A2332] dark:text-slate-100 mb-2 font-serif">病例库</h1>
        <p className="text-[#6B7F96] dark:text-slate-400 mb-3">从 SVT 鉴别到室速标测，AI 导师引导你像专家一样思考每一个决策点</p>
        <p className="text-xs text-[#8FA0B4] dark:text-slate-500 mb-4 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>⚡ 50+ 精选案例</span><span className="text-[#C5D3E0] dark:text-slate-600">|</span>
          <span>🎯 覆盖 SVT / VT / AF / AFL</span><span className="text-[#C5D3E0] dark:text-slate-600">|</span>
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
            {categories.map((c) => <FilterBtn key={c.value} active={category===c.value} onClick={()=>setCategory(c.value)}>{c.label}</FilterBtn>)}
            <div className="w-px bg-[#E8ECF0] dark:bg-slate-700 mx-1 sm:mx-2 h-6 shrink-0 hidden sm:block" />
            {difficulties.map((d) => <FilterBtn key={d.value} active={difficulty===d.value} onClick={()=>setDifficulty(d.value)}>{d.label}</FilterBtn>)}
            <div className="w-px bg-[#E8ECF0] dark:bg-slate-700 mx-1 sm:mx-2 h-6 shrink-0 hidden sm:block" />
            <span className="text-xs text-[#8FA0B4] dark:text-slate-500 mr-1 shrink-0 flex items-center">QRS</span>
            {qrsTypes.map((q) => <FilterBtn key={q.value} active={qrsType===q.value} onClick={()=>setQrsType(q.value)}>{q.label}</FilterBtn>)}
            <div className="w-px bg-[#E8ECF0] dark:bg-slate-700 mx-1 sm:mx-2 h-6 shrink-0 hidden sm:block" />
            <span className="text-xs text-[#8FA0B4] dark:text-slate-500 mr-1 shrink-0 flex items-center">标测</span>
            {mappingSystems.map((m) => <FilterBtn key={m.value} active={mapping===m.value} onClick={()=>setMapping(m.value)}>{m.label}</FilterBtn>)}
          </div>
        </div>

        {loading ? <SkeletonPage variant="case" count={6} /> : filtered.length===0 ? <div className="text-center py-20"><p className="text-[#6B7F96] dark:text-slate-400">{keyword ? "未找到匹配的病例，试试其他关键词" : "暂无匹配的病例"}</p></div>
        : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((c) => (
              <div
                key={c.id} role="link" tabIndex={0}
                onClick={() => router.push(ROUTES.CASE_DETAIL(c.id))}
                onKeyDown={(e)=>{if(e.key==="Enter")e.currentTarget.click();}}
                className="card group flex flex-col cursor-pointer"
              >
                {/* Thumbnail placeholder */}
                <div className="bg-[#F5F8FC] dark:bg-slate-800 rounded-lg mb-4 h-28 flex items-center justify-center text-3xl select-none shrink-0">
                  ⚡
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`badge-category ${catColors[c.category]||""}`}>{c.category}</span>
                    <span className={`badge-difficulty ${diffColors[c.difficulty]||""}`}>{c.difficulty}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-[#1A2332] dark:text-slate-100 mb-2 font-serif group-hover:text-[#1B4F8A] dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                    {c.title}
                  </h3>
                  <p className="text-sm text-[#6B7F96] dark:text-slate-400 mb-3" style={{display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
                    {c.description}
                  </p>

                  {/* Key clinical info */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {c.key_points?.slice(0, 2).map((kp, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded bg-[#F5F8FC] dark:bg-slate-800 text-[#6B7F96] dark:text-slate-400">{kp}</span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#8FA0B4] dark:text-slate-500 mb-4">
                    <span className="flex items-center gap-1"><span>⏱</span><span>{studyTime[c.difficulty]||"15 分钟"}</span></span>
                    <span className="flex items-center gap-1"><span>👥</span><span>128 人已学习</span></span>
                  </div>
                </div>

                <span className="block w-full text-center py-2.5 rounded-[10px] text-white text-sm font-medium bg-[#1B4F8A] dark:bg-blue-600 group-hover:bg-[#154070] dark:group-hover:bg-blue-500 transition-all duration-200">
                  AI 导师带你分析 →
                </span>
              </div>
            ))}
          </div>
        }
      </div>
    </AppLayout>
  );
}

export default function CasesPage() {
  return <Suspense fallback={<SkeletonPage variant="case" count={6} />}><CaseList /></Suspense>;
}
