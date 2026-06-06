"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { caseService, authService } from "@/lib/services";
import { ROUTES } from "@/lib/routes";

interface Case {
  id: string; title: string; category: string; difficulty: string;
  description: string; ecg_findings: string[]; question: string;
  hint: string; key_points: string[]; is_published: boolean;
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

const catColors: Record<string, string> = {
  SVT: "bg-[#EBF2FA] text-[#1B4F8A]", VT: "bg-[#FDE8E8] text-[#9B2C2C]",
  AF: "bg-[#FEF3E2] text-[#854F0B]", AFL: "bg-[#EDE9FB] text-[#4C3D9E]",
};

const diffColors: Record<string, string> = {
  "基础": "bg-[#E8F4F0] text-[#0F6E56]", "进阶": "bg-[#FEF3E2] text-[#854F0B]", "高级": "bg-[#FDE8E8] text-[#9B2C2C]",
};

const studyTime: Record<string, string> = { "基础": "15 分钟", "进阶": "25 分钟", "高级": "40 分钟" };

function matchQrs(findings: string[], q: string): boolean {
  if (!q) return true;
  if (q === "narrow") return findings.some((f) => f.includes("窄QRS") || f.includes("窄 QRS"));
  if (q === "wide") return findings.some((f) => f.includes("宽QRS") || f.includes("宽 QRS"));
  if (q === "flutter") return findings.some((f) => f.includes("flutter") || f.includes("扑动") || f.includes("AFL"));
  return true;
}

const FilterBtn = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${active ? "bg-[#1B4F8A] text-white border-[#1B4F8A]" : "bg-white text-[#4B6080] border-[#C5D3E0] hover:border-[#1B4F8A] hover:text-[#1B4F8A]"}`}>{active && "✓ "}{children}</button>
);

function CaseList() {
  const searchParams = useSearchParams(); const router = useRouter();
  const [allCases, setAllCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [difficulty, setDifficulty] = useState("");
  const [qrsType, setQrsType] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => { setLoggedIn(authService.isLoggedIn()); }, []);
  useEffect(() => { caseService.getCases().then((c) => { setAllCases(c); setLoading(false); }); }, []);

  const filtered = allCases.filter((c) => {
    if (category && c.category !== category) return false;
    if (difficulty && c.difficulty !== difficulty) return false;
    if (!matchQrs(c.ecg_findings || [], qrsType)) return false;
    return true;
  });

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-[#1A2332] mb-2 font-serif">病例库</h1>
        <p className="text-[#6B7F96] mb-3">从 SVT 鉴别到室速标测，AI 导师引导你像专家一样思考每一个决策点</p>
        <p className="text-xs text-[#8FA0B4] mb-4 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>⚡ 50+ 精选案例</span><span className="text-[#C5D3E0]">|</span>
          <span>🎯 覆盖 SVT / VT / AF / AFL</span><span className="text-[#C5D3E0]">|</span>
          <span>👨‍⚕️ AI 苏格拉底式教学</span>
        </p>
        {!loggedIn && (
          <div className="mb-8 px-4 py-3 rounded-xl border border-[#1B4F8A]/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" style={{ background: "#EBF2FA" }}>
            <span className="text-sm text-[#1A2332]">🎓 免费注册即可与 AI 导师对话，开始学习</span>
            <a href={ROUTES.AUTH_REGISTER} className="text-sm font-medium text-[#1B4F8A] hover:text-[#154070] transition-colors whitespace-nowrap self-end sm:self-auto">立即注册 →</a>
          </div>
        )}
        {/* 筛选器 — 移动端横向滚动，桌面端换行 */}
        <div className="filter-bar sm:flex-wrap sm:overflow-visible mb-8 items-center">
          {categories.map((c) => <FilterBtn key={c.value} active={category===c.value} onClick={()=>setCategory(c.value)}>{c.label}</FilterBtn>)}
          <div className="w-px bg-[#E8ECF0] mx-1 sm:mx-2 h-6 shrink-0 hidden sm:block" />
          {difficulties.map((d) => <FilterBtn key={d.value} active={difficulty===d.value} onClick={()=>setDifficulty(d.value)}>{d.label}</FilterBtn>)}
          <div className="w-px bg-[#E8ECF0] mx-1 sm:mx-2 h-6 shrink-0 hidden sm:block" />
          <span className="text-xs text-[#8FA0B4] mr-1 shrink-0 flex items-center">QRS</span>
          {qrsTypes.map((q) => <FilterBtn key={q.value} active={qrsType===q.value} onClick={()=>setQrsType(q.value)}>{q.label}</FilterBtn>)}
        </div>
        {loading ? <div className="text-center py-20 text-[#6B7F96]">加载中...</div>
        : filtered.length===0 ? <div className="text-center py-20"><p className="text-[#6B7F96]">暂无匹配的病例</p></div>
        : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((c) => (
              <div key={c.id} role="link" tabIndex={0}
                onClick={() => {
                  if (!loggedIn) { alert("请先登录或注册，即可免费开始学习"); router.push(ROUTES.AUTH_REDIRECT(ROUTES.CASE_DETAIL(c.id))); }
                  else router.push(ROUTES.CASE_DETAIL(c.id));
                }}
                onKeyDown={(e)=>{if(e.key==="Enter")e.currentTarget.click();}}
                className="card group flex flex-col cursor-pointer"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3"><span className={`badge-category ${catColors[c.category]||""}`}>{c.category}</span><span className={`badge-difficulty ${diffColors[c.difficulty]||""}`}>{c.difficulty}</span></div>
                  <h3 className="text-lg font-semibold text-[#1A2332] mb-2 font-serif group-hover:text-[#1B4F8A] transition-colors">{c.title}</h3>
                  <p className="text-sm text-[#6B7F96] mb-3" style={{display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{c.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">{c.key_points?.slice(0,3).map((kp,i)=><span key={i} className="text-xs px-2 py-0.5 rounded bg-[#F5F8FC] text-[#6B7F96]">{kp}</span>)}</div>
                  <div className="flex items-center justify-between text-xs text-[#8FA0B4] mb-4"><span className="flex items-center gap-1"><span>⏱</span><span>{studyTime[c.difficulty]||"15 分钟"}</span></span><span className="flex items-center gap-1"><span>👥</span><span>128 人已学习</span></span></div>
                </div>
                <span className="block w-full text-center py-2.5 rounded-[10px] text-white text-sm font-medium bg-[#1B4F8A] group-hover:bg-[#154070] transition-all duration-200">开始学习 →</span>
              </div>
            ))}
          </div>
        }
      </div>
    </AppLayout>
  );
}

export default function CasesPage() {
  return <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[#F5F8FC]"><p className="text-[#6B7F96]">加载中...</p></div>}><CaseList /></Suspense>;
}
