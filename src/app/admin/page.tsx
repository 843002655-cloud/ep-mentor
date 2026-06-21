import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import AdminNav from "@/components/AdminNav";
import { fetchAdminAnalytics } from "@/lib/admin-analytics";
import { ROUTES } from "@/lib/routes";

export default async function AdminDashboardPage() {
  const analytics = await fetchAdminAnalytics(7);
  const { pv, uv, totalChats, caseCompletions, registrations, dailyTrend, pages } = analytics;
  const maxT = Math.max(...dailyTrend.map((d) => d[1]), 1);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminNav />
        <h1 className="text-2xl font-bold text-[#1A2332] dark:text-slate-100 font-serif mb-2">📊 数据统计</h1>
        <p className="text-sm text-[#6B7F96] dark:text-slate-400 mb-8">
          近 7 天 · 快速跳转{" "}
          <Link href={ROUTES.ADMIN_CASES} className="text-[#1B4F8A] dark:text-blue-400 hover:underline">
            病例管理
          </Link>
        </p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { icon: "👁️", label: "页面浏览 (PV)", value: String(pv) },
            { icon: "👤", label: "独立访客 (UV)", value: String(uv) },
            { icon: "🤖", label: "AI 对话次数", value: String(totalChats) },
            { icon: "✅", label: "病例完成", value: String(caseCompletions) },
            { icon: "📝", label: "新注册用户", value: String(registrations) },
          ].map((kpi) => (
            <div key={kpi.label} className="card text-center">
              <div className="text-2xl mb-1">{kpi.icon}</div>
              <div className="text-2xl font-bold text-[#1B4F8A] dark:text-blue-400">{kpi.value}</div>
              <div className="text-xs text-[#6B7F96] dark:text-slate-400 mt-1">{kpi.label}</div>
            </div>
          ))}
        </div>

        <div className="card mb-6">
          <h3 className="text-sm font-semibold text-[#1A2332] dark:text-slate-100 mb-4">📈 每日访问趋势</h3>
          <div className="flex items-end gap-1 h-32">
            {dailyTrend.length === 0 && (
              <p className="text-sm text-[#6B7F96] dark:text-slate-400 w-full text-center self-center">暂无数据</p>
            )}
            {dailyTrend.map(([day, count]) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1 min-w-[28px]">
                <span className="text-[10px] text-[#6B7F96] dark:text-slate-400">{count}</span>
                <div
                  className="w-full bg-[#1B4F8A] dark:bg-blue-600 rounded-t"
                  style={{ height: `${Math.max((count / maxT) * 100, 4)}%`, minHeight: "4px" }}
                />
                <span className="text-[10px] text-[#8FA0B4] dark:text-slate-500">{day.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-[#1A2332] dark:text-slate-100 mb-4">🔗 热门页面</h3>
          {pages.length === 0 ? (
            <p className="text-sm text-[#6B7F96] dark:text-slate-400">暂无数据</p>
          ) : (
            pages.map(([p, c]) => (
              <div
                key={p}
                className="flex justify-between text-sm py-1.5 px-2 border-b border-[#F5F8FC] dark:border-slate-800 last:border-0"
              >
                <span className="text-[#3D5166] dark:text-slate-300 truncate mr-4">{p || "/"}</span>
                <span className="text-[#1B4F8A] dark:text-blue-400 font-medium shrink-0">{c}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
