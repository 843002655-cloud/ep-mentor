"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";

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

function CaseList() {
  const searchParams = useSearchParams();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [difficulty, setDifficulty] = useState("");

  useEffect(() => {
    const fetchCases = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (difficulty) params.set("difficulty", difficulty);

      const res = await fetch(`/api/cases?${params.toString()}`);
      const data = await res.json();
      setCases(data.cases || []);
      setLoading(false);
    };
    fetchCases();
  }, [category, difficulty]);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">病例库</h1>
        <p className="text-ep-muted mb-8">
          浏览经典心脏电生理教学案例，与 AI 导师互动学习
        </p>

        <div className="flex flex-wrap gap-3 mb-8">
          {categories.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                category === c.value
                  ? "bg-ep-primary/20 text-ep-primary border-ep-primary/50"
                  : "bg-ep-card text-ep-muted border-slate-700 hover:border-slate-500"
              }`}
            >
              {c.label}
            </button>
          ))}
          <div className="w-px bg-slate-700 mx-2" />
          {difficulties.map((d) => (
            <button
              key={d.value}
              onClick={() => setDifficulty(d.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                difficulty === d.value
                  ? "bg-ep-primary/20 text-ep-primary border-ep-primary/50"
                  : "bg-ep-card text-ep-muted border-slate-700 hover:border-slate-500"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-ep-muted">加载中...</div>
        ) : cases.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-ep-muted">暂无病例数据</p>
            <p className="text-sm text-ep-muted mt-2">
              请先在 Supabase SQL Editor 中执行种子数据
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cases.map((c) => (
              <Link key={c.id} href={`/cases/${c.id}`} className="card group flex flex-col">
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
                  <p className="text-sm text-ep-muted line-clamp-2 mb-3">
                    {c.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {c.key_points?.slice(0, 3).map((kp, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded bg-slate-800 text-ep-muted">
                        {kp}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-ep-muted flex items-center gap-1 mb-4">
                    <span>⏱</span>
                    <span>预计学习：{studyTime[c.difficulty] || "15 分钟"}</span>
                  </p>
                </div>
                <span className="block w-full text-center py-2.5 rounded-[10px] text-white text-sm font-medium bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] group-hover:brightness-110 group-hover:scale-[1.02] transition-all duration-200">
                  开始学习 →
                </span>
              </Link>
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
