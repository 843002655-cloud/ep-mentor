"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { progressService, authService } from "@/lib/services";
import { SkeletonPage } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import { ROUTES } from "@/lib/routes";
import { replaceTo } from "@/lib/browser";
import type { ProgressItem } from "@/lib/services";
import { usePageTitle } from "@/lib/hooks/usePageTitle";

export default function DashboardPage() {
  usePageTitle("学习仪表盘");
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [totalCases, setTotalCases] = useState(0);

  useEffect(() => {
    authService.getUser().then((u) => {
      if (!u) {
        replaceTo(ROUTES.AUTH_REDIRECT(ROUTES.DASHBOARD));
        return;
      }
      setUserEmail(u.email || "");
      setAuthChecked(true);
      progressService
        .getUserProgress()
        .then((d) => {
          if (d) {
            setProgress(d.progress);
            setTotalCases(d.totalCases);
          }
        })
        .finally(() => setLoading(false));
    });
  }, []);

  const stats = progressService.getStats(progress, totalCases);
  const catColors: Record<string, string> = { SVT: "bg-[#EBF2FA] dark:bg-blue-900/30 text-[#1B4F8A] dark:text-blue-300", VT: "bg-[#FDE8E8] dark:bg-red-900/30 text-[#9B2C2C] dark:text-red-300", AF: "bg-[#FEF3E2] dark:bg-amber-900/30 text-[#854F0B] dark:text-amber-300" };

  if (!authChecked || loading) return <AppLayout><SkeletonPage variant="stat" /></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-[#1A2332] dark:text-slate-100 mb-2 font-serif">学习进度</h1>
        <p className="text-[#6B7F96] dark:text-slate-400 mb-8">{userEmail}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[{ v: stats.completedCount, l: "完成病例", c: "text-[#1B4F8A] dark:text-blue-400" },{ v: stats.totalCases, l: "总病例数", c: "text-[#4C3D9E] dark:text-purple-400" },{ v: stats.todayCount, l: "今日完成", c: "text-[#0F6E56] dark:text-emerald-400" },{ v: `${stats.completionRate}%`, l: "完成率", c: "text-[#854F0B] dark:text-amber-400" }].map((s,i)=>(
            <div key={i} className="card text-center"><div className={`text-2xl font-bold ${s.c}`}>{s.v}</div><div className="text-sm text-[#6B7F96] dark:text-slate-400 mt-1">{s.l}</div></div>
          ))}
        </div>
        <h2 className="text-xl font-semibold text-[#1A2332] dark:text-slate-100 mb-4 font-serif">最近学习</h2>
        {progress.length===0 ? <EmptyState icon="🫀" title="还没有学习记录" description="开始你的第一个电生理病例学习之旅" actionHref={ROUTES.CASES} actionLabel="去病例库学习" />
        : <div className="space-y-3">{progress.slice(0,20).map((p,i)=>(
            <Link key={i} href={ROUTES.CASE_DETAIL(p.case_id)} className="card flex items-center justify-between py-4 hover:border-[#1B4F8A] dark:hover:border-blue-400 transition-colors">
              <div className="flex items-center gap-3 min-w-0">{p.cases?.category && <span className={`badge-category ${catColors[p.cases.category]||""}`}>{p.cases.category}</span>}<span className="text-[#1A2332] dark:text-slate-100 truncate">{p.cases?.title||"未知"}</span></div>
              <span className="text-sm text-[#8FA0B4] dark:text-slate-500 shrink-0 ml-2">{new Date(p.completed_at).toLocaleDateString("zh-CN")}</span>
            </Link>
          ))}</div>
        }
      </div>
    </AppLayout>
  );
}
