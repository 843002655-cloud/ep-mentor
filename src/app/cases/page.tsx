"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  created_at: string;
}

const categories = [
  { value: "", label: "全部" },
  { value: "SVT", label: "SVT" },
  { value: "VT", label: "VT" },
  { value: "AF", label: "AF" },
  { value: "WPW", label: "WPW" },
];

const difficulties = [
  { value: "", label: "全部难度" },
  { value: "基础", label: "基础" },
  { value: "进阶", label: "进阶" },
  { value: "高级", label: "高级" },
];

const qrsTypes = [
  { value: "", label: "全部" },
  { value: "narrow", label: "窄QRS" },
  { value: "wide", label: "宽QRS" },
  { value: "delta", label: "预激波" },
];

const categoryColors: Record<string, string> = {
  SVT: "bg-svt/20 text-svt",
  VT: "bg-vt/20 text-vt",
  AF: "bg-af/20 text-af",
  WPW: "bg-wpw/20 text-wpw",
};

const difficultyColors: Record<string, string> = {
  "基础": "bg-diff-basic/20 text-diff-basic",
  "进阶": "bg-diff-intermediate/20 text-diff-intermediate",
  "高级": "bg-diff-advanced/20 text-diff-advanced",
};

const studyTime: Record<string, string> = {
  "基础": "15 分钟",
  "进阶": "25 分钟",
  "高级": "40 分钟",
};

// QRS 类型关键词匹配
function matchQrs(findings: string[], qrsType: string): boolean {
  if (!qrsType) return true;
  if (qrsType === "narrow") return findings.some((f) => f.includes("窄QRS") || f.includes("窄 QRS"));
  if (qrsType === "wide") return findings.some((f) => f.includes("宽QRS") || f.includes("宽 QRS"));
  if (qrsType === "delta") return findings.some((f) => f.includes("delta") || f.includes("预激") || f.includes("WPW"));
  return true;
}

const FilterButton = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
      active
        ? "bg-ep-primary/20 text-ep-primary border-ep-primary/50"
        : "bg-ep-card text-ep-muted border-slate-700 hover:border-slate-500"
    }`}
  >
    {active && "✓ "}
    {children}
  </button>
);

function CaseList() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [allCases, setAllCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [difficulty, setDifficulty] = useState("");
  const [qrsType, setQrsType] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    getSupabase().auth.getUser().then(({ data: { user } }) => {
      setLoggedIn(!!user);
    });
  }, []);

  // Fetch all cases on mount, then filter client-side
  useEffect(() => {
    const fetchCases = async () => {
      setLoading(true);
      const res = await fetch(`/api/cases`);
      const data = await res.json();
      setAllCases(data.cases || []);
      setLoading(false);
    };
    fetchCases();
  }, []);

  // Client-side filtering
  const filteredCases = allCases.filter((c) => {
    if (category && c.category !== category) return false;
    if (difficulty && c.difficulty !== difficulty) return false;
    if (!matchQrs(c.ecg_findings || [], qrsType)) return false;
    return true;
  });

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">病例库</h1>
        <p className="text-ep-muted mb-3">
          从 SVT 鉴别到室速标测，AI 导师引导你像专家一样思考每一个决策点
        </p>
        <p className="text-xs text-ep-muted mb-4 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>⚡ 50+ 精选案例</span>
          <span className="text-slate-600">|</span>
          <span>🎯 覆盖 SVT / VT / AF / WPW</span>
          <span className="text-slate-600">|</span>
          <span>👨‍⚕️ AI 苏格拉底式教学</span>
        </p>

        {!loggedIn && (
          <div className="mb-8 px-4 py-3 rounded-xl border border-[#6366f1]/30 flex items-center justify-between" style={{ background: "rgba(99,102,241,0.08)" }}>
            <span className="text-sm text-white">
              🎓 免费注册即可与 AI 导师对话，开始学习
            </span>
            <a href="/auth?register=1" className="text-sm font-medium text-[#a5b4fc] hover:text-white transition-colors ml-4 whitespace-nowrap">
              立即注册 →
            </a>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8 items-center">
          {categories.map((c) => (
            <FilterButton key={c.value} active={category === c.value} onClick={() => setCategory(c.value)}>
              {c.label}
            </FilterButton>
          ))}
          <div className="w-px bg-slate-700 mx-2 h-6" />
          {difficulties.map((d) => (
            <FilterButton key={d.value} active={difficulty === d.value} onClick={() => setDifficulty(d.value)}>
              {d.label}
            </FilterButton>
          ))}
          <div className="w-px bg-slate-700 mx-2 h-6" />
          <span className="text-xs text-ep-muted mr-1">QRS</span>
          {qrsTypes.map((q) => (
            <FilterButton key={q.value} active={qrsType === q.value} onClick={() => setQrsType(q.value)}>
              {q.label}
            </FilterButton>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-ep-muted">加载中...</div>
        ) : filteredCases.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-ep-muted">暂无匹配的病例</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCases.map((c) => (
              <div
                key={c.id}
                role="link"
                tabIndex={0}
                onClick={() => {
                  if (!loggedIn) {
                    alert("请先登录或注册，即可免费开始学习");
                    router.push("/auth?register=1&redirect=" + encodeURIComponent("/cases/" + c.id));
                  } else {
                    router.push("/cases/" + c.id);
                  }
                }}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.click(); }}
                className="card group flex flex-col cursor-pointer"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`badge-category ${categoryColors[c.category] || ""}`}>
                      {c.category}
                    </span>
                    <span className={`badge-difficulty ${difficultyColors[c.difficulty] || ""}`}>
                      {c.difficulty}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-ep-primary transition-colors">
                    {c.title}
                  </h3>
                  <p
                    className="text-sm text-ep-muted mb-3"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {c.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {c.key_points?.slice(0, 3).map((kp, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded bg-slate-800 text-ep-muted">
                        {kp}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-ep-muted mb-4">
                    <span className="flex items-center gap-1">
                      <span>⏱</span>
                      <span>{studyTime[c.difficulty] || "15 分钟"}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span>👥</span>
                      <span>128 人已学习</span>
                    </span>
                  </div>
                </div>
                <span className="block w-full text-center py-2.5 rounded-[10px] text-white text-sm font-medium bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] group-hover:brightness-110 group-hover:scale-[1.02] transition-all duration-200">
                  开始学习 →
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function CasesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-ep-bg"><p className="text-ep-muted">加载中...</p></div>}>
      <CaseList />
    </Suspense>
  );
}
