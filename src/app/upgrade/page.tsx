import AppLayout from "@/components/AppLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "升级会员",
  description: "升级 EP Mentor 会员，解锁无限AI对话、优先获取最新病例等特权",
};

export default function UpgradePage() {
  return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <h1 className="text-3xl font-bold text-[#1A2332] dark:text-slate-100 mb-4 font-serif">升级会员</h1>
        <p className="text-[#6B7F96] dark:text-slate-400 mb-8 leading-relaxed">
          升级会员即可享受无限次 AI 导师对话、优先获取最新病例、专属学习报告等特权。
        </p>
        <div className="card mb-6">
          <div className="text-2xl font-bold text-[#1B4F8A] dark:text-blue-400 mb-2">¥19.9 / 月</div>
          <ul className="text-sm text-[#3D5166] dark:text-slate-300 space-y-2 text-left mb-6">
            <li>✅ 无限次 AI 对话</li>
            <li>✅ 全部病例库访问</li>
            <li>✅ 优先获取最新病例</li>
            <li>✅ 专属学习数据报告</li>
            <li>🔜 直播课程折扣</li>
          </ul>
          <button className="btn-primary w-full" disabled>
            即将上线
          </button>
        </div>
        <p className="text-xs text-[#8FA0B4] dark:text-slate-500">支付功能开发中，如需升级请联系管理员</p>
      </div>
    </AppLayout>
  );
}
