"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { progressService, authService } from "@/lib/services";
import { SkeletonBox } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import type { ProgressItem } from "@/lib/services";
import { ROUTES } from "@/lib/routes";
import { usePageTitle } from "@/lib/hooks/usePageTitle";

const roleLabels: Record<string, string> = {
  resident: "住院医 / 进修生",
  junior: "初级术者",
  mid: "中级术者",
  senior: "高级术者",
  other: "其他",
};

const subspecialtyLabels: Record<string, string> = {
  svt: "SVT", af: "房颤", vt: "室速", afl: "房扑",
  device: "起搏/ICD", pedia: "小儿 EP",
};

const badgeDefs = [
  { name: "初入导管室", icon: "🫀", desc: "完成首个病例", check: (p: ProgressItem[]) => new Set(p.map((x) => x.case_id)).size >= 1 },
  { name: "SVT 猎手", icon: "🎯", desc: "完成 5 个 SVT 病例", check: (p: ProgressItem[]) => p.filter((x) => x.cases?.category === "SVT").length >= 5 },
  { name: "AF 专家", icon: "⚡", desc: "完成 5 个 AF 病例", check: (p: ProgressItem[]) => p.filter((x) => x.cases?.category === "AF").length >= 5 },
  { name: "VT 大师", icon: "🔥", desc: "完成 5 个 VT 病例", check: (p: ProgressItem[]) => p.filter((x) => x.cases?.category === "VT").length >= 5 },
  { name: "勤奋学习者", icon: "📚", desc: "完成 20 个病例", check: (p: ProgressItem[]) => new Set(p.map((x) => x.case_id)).size >= 20 },
  { name: "完成达人", icon: "🏆", desc: "完成率 80%+", check: (_p: ProgressItem[], _t: number, rate: number) => rate >= 80 },
];

export default function ProfilePage() {
  usePageTitle("个人中心");
  const [user, setUser] = useState<{ email?: string; user_metadata?: Record<string, string> } | null>(null);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [totalCases, setTotalCases] = useState(0);
  const [quota, setQuota] = useState<{ used: number; remaining: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService.getUser().then((u) => {
      setUser(u as { email?: string; user_metadata?: Record<string, string> } | null);
    });
    Promise.all([
      progressService.getUserProgress().catch(() => null),
      progressService.getQuota().catch(() => null),
    ]).then(([d, q]) => {
      if (d) {
        setProgress(d.progress);
        setTotalCases(d.totalCases);
      }
      if (q) setQuota(q);
    }).finally(() => setLoading(false));
  }, []);

  const stats = progressService.getStats(progress, totalCases);
  const metadata = user?.user_metadata || {};
  const role = metadata.role || "";
  const interests = metadata.interests ? metadata.interests.split(",").filter(Boolean) : [];
  const badges = badgeDefs.map((b) => ({
    ...b,
    unlocked: b.check(progress, totalCases, stats.completionRate),
  }));

  if (loading) return <AppLayout><div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12"><div className="card mb-6 flex items-center gap-4"><SkeletonBox className="w-16 h-16 rounded-full" /><div className="flex-1"><SkeletonBox className="h-6 w-40 mb-2" /><div className="flex gap-2"><SkeletonBox className="h-5 w-20 rounded-full" /><SkeletonBox className="h-5 w-16 rounded-full" /></div></div></div><div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">{Array.from({length:4}).map((_,i)=><div key={i} className="card text-center"><SkeletonBox className="h-8 w-8 mx-auto mb-2 rounded" /><SkeletonBox className="h-7 w-12 mx-auto mb-1" /><SkeletonBox className="h-4 w-16 mx-auto" /></div>)}</div></div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="card mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1B4F8A] to-[#4C3D9E] flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {user?.email?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#1A2332] dark:text-slate-100 font-serif">{user?.email || "访客"}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {role && <span className="text-xs px-2 py-0.5 rounded-full bg-[#EBF2FA] dark:bg-slate-700 text-[#1B4F8A] dark:text-blue-400">{roleLabels[role] || role}</span>}
              {interests.map((k) => (
                <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-[#F5F8FC] dark:bg-slate-800 text-[#6B7F96] dark:text-slate-400">{subspecialtyLabels[k] || k}</span>
              ))}
            </div>
          </div>
          {!user && (
            <Link href={ROUTES.AUTH} className="text-sm text-[#1B4F8A] dark:text-blue-400 hover:underline">登录 / 注册</Link>
          )}
        </div>

        {quota && !authService.isLoggedIn() && (
          <div className="card mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#6B7F96] dark:text-slate-400">今日 AI 对话配额</span>
              <span className="text-[#1B4F8A] dark:text-blue-400 font-medium">{quota.used}/{quota.total}</span>
            </div>
            <div className="h-2 bg-[#F5F8FC] dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-[#1B4F8A] dark:bg-blue-600 rounded-full transition-all" style={{ width: `${Math.min(100, (quota.used / quota.total) * 100)}%` }} />
            </div>
            <p className="text-xs text-[#8FA0B4] dark:text-slate-500 mt-2">登录后可享受更多对话次数</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { v: stats.completedCount, l: "已完成病例", c: "text-[#1B4F8A] dark:text-blue-400", icon: "📚" },
            { v: stats.totalCases, l: "总病例数", c: "text-[#4C3D9E] dark:text-purple-400", icon: "📋" },
            { v: stats.todayCount, l: "今日完成", c: "text-[#0F6E56] dark:text-emerald-400", icon: "✅" },
            { v: `${stats.completionRate}%`, l: "完成率", c: "text-[#854F0B] dark:text-amber-400", icon: "📊" },
          ].map((s, i) => (
            <div key={i} className="card text-center">
              <span className="text-2xl">{s.icon}</span>
              <div className={`text-2xl font-bold mt-1 ${s.c}`}>{s.v}</div>
              <div className="text-xs text-[#6B7F96] dark:text-slate-400 mt-1">{s.l}</div>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-semibold text-[#1A2332] dark:text-slate-100 mb-4 font-serif">🏅 学习徽章</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-8">
          {badges.map((b) => (
            <div key={b.name} className={`card text-center p-4 ${!b.unlocked && "opacity-40"}`} title={b.desc}>
              <div className="text-2xl mb-1">{b.icon}</div>
              <div className="text-xs font-medium text-[#1A2332] dark:text-slate-100">{b.name}</div>
              <div className="text-xs text-[#8FA0B4] dark:text-slate-500 mt-0.5">{b.unlocked ? "已解锁" : "未解锁"}</div>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-semibold text-[#1A2332] dark:text-slate-100 mb-4 font-serif">📖 最近学习</h2>
        {progress.length === 0 ? (
          <EmptyState icon="🫀" title="还没有学习记录" description="完成一个病例的全部步骤后，进度会显示在这里" actionHref={ROUTES.CASES} actionLabel="去病例库学习" />
        ) : (
          <div className="space-y-3">
            {progress.slice(0, 10).map((p, i) => (
              <Link key={i} href={ROUTES.CASE_DETAIL(p.case_id)} className="card flex items-center justify-between py-4 hover:border-[#1B4F8A] dark:hover:border-blue-400 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm text-[#8FA0B4] dark:text-slate-500 shrink-0">{p.cases?.category || "—"}</span>
                  <span className="text-[#1A2332] dark:text-slate-100 truncate">{p.cases?.title || "未知"}</span>
                </div>
                <span className="text-xs text-[#8FA0B4] dark:text-slate-500 shrink-0 ml-2">{new Date(p.completed_at).toLocaleDateString("zh-CN")}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
