"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { progressService, authService } from "@/lib/services";
import { SkeletonBox } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import type { ProgressItem } from "@/lib/services";
import { ROUTES } from "@/lib/routes";

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

const badges = [
  { name: "初入导管室", icon: "🫀", desc: "完成首个病例", unlocked: true },
  { name: "SVT 猎手", icon: "🎯", desc: "完成 5 个 SVT 病例", unlocked: false },
  { name: "AF 专家", icon: "⚡", desc: "完成 5 个 AF 病例", unlocked: false },
  { name: "VT 大师", icon: "🔥", desc: "完成 5 个 VT 病例", unlocked: false },
  { name: "苏格拉底门徒", icon: "🧠", desc: "累计 50 次 AI 对话", unlocked: false },
  { name: "病例贡献者", icon: "📤", desc: "投稿 3 个病例", unlocked: false },
];

export default function ProfilePage() {
  const [user, setUser] = useState<{ email?: string; user_metadata?: Record<string, string> } | null>(null);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [totalCases, setTotalCases] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService.getUser().then((u) => {
      setUser(u as { email?: string; user_metadata?: Record<string, string> } | null);
    });
    progressService.getUserProgress().then((d) => {
      if (d) { setProgress(d.progress); setTotalCases(d.totalCases); }
    }).finally(() => setLoading(false));
  }, []);

  const stats = progressService.getStats(progress, totalCases);
  const metadata = user?.user_metadata || {};
  const role = metadata.role || "";
  const interests = metadata.interests ? metadata.interests.split(",").filter(Boolean) : [];

  if (loading) return <AppLayout><div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12"><div className="card mb-6 flex items-center gap-4"><SkeletonBox className="w-16 h-16 rounded-full" /><div className="flex-1"><SkeletonBox className="h-6 w-40 mb-2" /><div className="flex gap-2"><SkeletonBox className="h-5 w-20 rounded-full" /><SkeletonBox className="h-5 w-16 rounded-full" /></div></div></div><div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">{Array.from({length:4}).map((_,i)=><div key={i} className="card text-center"><SkeletonBox className="h-8 w-8 mx-auto mb-2 rounded" /><SkeletonBox className="h-7 w-12 mx-auto mb-1" /><SkeletonBox className="h-4 w-16 mx-auto" /></div>)}</div><SkeletonBox className="h-6 w-32 mb-4" /><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-8">{Array.from({length:6}).map((_,i)=><div key={i} className="card text-center p-4"><SkeletonBox className="h-6 w-6 mx-auto mb-1 rounded" /><SkeletonBox className="h-4 w-16 mx-auto mb-1" /><SkeletonBox className="h-3 w-10 mx-auto" /></div>)}</div></div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* User header */}
        <div className="card mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1B4F8A] to-[#4C3D9E] flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {user?.email?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#1A2332] dark:text-slate-100 font-serif">{user?.email || "用户"}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {role && <span className="text-xs px-2 py-0.5 rounded-full bg-[#EBF2FA] dark:bg-slate-700 text-[#1B4F8A] dark:text-blue-400">{roleLabels[role] || role}</span>}
              {interests.map((k) => (
                <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-[#F5F8FC] dark:bg-slate-800 text-[#6B7F96] dark:text-slate-400">{subspecialtyLabels[k] || k}</span>
              ))}
            </div>
          </div>
          <Link href={ROUTES.AUTH} className="text-sm text-[#6B7F96] dark:text-slate-400 hover:text-[#1B4F8A] dark:hover:text-blue-400 transition-colors">编辑资料</Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { v: stats.completedCount, l: "已完成病例", c: "text-[#1B4F8A] dark:text-blue-400", icon: "📚" },
            { v: stats.totalCases, l: "总病例数", c: "text-[#4C3D9E] dark:text-purple-400", icon: "📋" },
            { v: stats.todayCount, l: "今日对话", c: "text-[#0F6E56] dark:text-emerald-400", icon: "💬" },
            { v: `${stats.completionRate}%`, l: "完成率", c: "text-[#854F0B] dark:text-amber-400", icon: "📊" },
          ].map((s, i) => (
            <div key={i} className="card text-center">
              <span className="text-2xl">{s.icon}</span>
              <div className={`text-2xl font-bold mt-1 ${s.c}`}>{s.v}</div>
              <div className="text-xs text-[#6B7F96] dark:text-slate-400 mt-1">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Badges */}
        <h2 className="text-xl font-semibold text-[#1A2332] dark:text-slate-100 mb-4 font-serif">🏅 学习徽章</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-8">
          {badges.map((b) => (
            <div key={b.name} className={`card text-center p-4 ${!b.unlocked && "opacity-40"}`}>
              <div className="text-2xl mb-1">{b.icon}</div>
              <div className="text-xs font-medium text-[#1A2332] dark:text-slate-100">{b.name}</div>
              <div className="text-xs text-[#8FA0B4] dark:text-slate-500 mt-0.5">{b.unlocked ? "已解锁" : "未解锁"}</div>
            </div>
          ))}
        </div>

        {/* Recent activity */}
        <h2 className="text-xl font-semibold text-[#1A2332] dark:text-slate-100 mb-4 font-serif">📖 最近学习</h2>
        {progress.length === 0 ? (
          <EmptyState icon="🫀" title="还没有学习记录" description="开始你的第一个电生理病例学习之旅" actionHref={ROUTES.CASES} actionLabel="去病例库学习" />
        ) : (
          <div className="space-y-3">
            {progress.slice(0, 10).map((p, i) => (
              <div key={i} className="card flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#8FA0B4] dark:text-slate-500">{p.cases?.category || "—"}</span>
                  <span className="text-[#1A2332] dark:text-slate-100">{p.cases?.title || "未知"}</span>
                </div>
                <span className="text-xs text-[#8FA0B4] dark:text-slate-500">{new Date(p.completed_at).toLocaleDateString("zh-CN")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
