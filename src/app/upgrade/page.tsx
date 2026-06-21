"use client";

import AppLayout from "@/components/AppLayout";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { usePageTitle } from "@/lib/hooks/usePageTitle";

const tiers = [
  {
    name: "免费学习",
    price: "免费",
    period: "永久",
    icon: "🎓",
    color: "border-[#1B4F8A]",
    bg: "bg-gradient-to-br from-blue-50 to-slate-50 dark:from-blue-950/30 dark:to-slate-900/30",
    btn: "bg-white dark:bg-slate-800 border border-[#C5D3E0] dark:border-slate-600 text-[#4B6080] dark:text-slate-300",
    btnText: "当前方案",
    features: [
      { text: "SVT / VT / AF 精选病例", ok: true },
      { text: "AI 苏格拉底式教学", ok: true },
      { text: "知识测验", ok: true },
      { text: "学习资料库", ok: true },
      { text: "AI 顾问（文字）", ok: true },
      { text: "无限 AI 对话", ok: false },
      { text: "优先获取新病例", ok: false },
    ],
  },
  {
    name: "Pro 会员",
    price: "¥199",
    period: "/年",
    icon: "⚡",
    color: "border-amber-500",
    bg: "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30",
    btn: "bg-amber-500 hover:bg-amber-600 text-white font-bold",
    btnText: "升级会员",
    highlight: true,
    features: [
      { text: "免费版全部内容", ok: true },
      { text: "无限次 AI 病例对话", ok: true },
      { text: "AI 顾问图片分析", ok: true },
      { text: "高级 VT / 复杂房扑病例", ok: true },
      { text: "学习进度报告", ok: true },
      { text: "优先获取最新病例", ok: true },
      { text: "专属技术支持", ok: true },
    ],
  },
  {
    name: "机构版",
    price: "¥999",
    period: "/年",
    icon: "🏥",
    color: "border-[#0F6E56]",
    bg: "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30",
    btn: "bg-[#1B4F8A] dark:bg-blue-600 hover:bg-[#154070] dark:hover:bg-blue-500 text-white",
    btnText: "联系开通",
    features: [
      { text: "Pro 全部权益", ok: true },
      { text: "20 个成员账号", ok: true },
      { text: "规培基地定制病例", ok: true },
      { text: "学习数据汇总报表", ok: true },
      { text: "专属 onboarding", ok: true },
      { text: "线下培训支持", ok: true },
      { text: "发票与合同", ok: true },
    ],
  },
];

const faqs = [
  {
    q: "试运行阶段需要付费吗？",
    a: "目前核心功能（病例学习、AI 对话、测验）均可免费使用。会员体系已就绪，正式收费前会提前通知。",
  },
  {
    q: "如何开通会员？",
    a: "扫描下方二维码完成微信支付，备注你的注册邮箱。管理员会在 24 小时内手动开通（自动回调接入后可即时生效）。",
  },
  {
    q: "与心电学堂是什么关系？",
    a: "EP Mentor 专注电生理专科进阶；心电学堂（xindianxuetang.com）覆盖基础心电图判读。两站共享账号体系，精进版会员可联动解锁。",
  },
  {
    q: "可以退款吗？",
    a: "购买后 7 天内可申请全额退款（AI 对话使用未超过 50 次）。联系 843002655@qq.com。",
  },
];

export default function UpgradePage() {
  usePageTitle("升级会员");

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1A2332] dark:text-slate-100 mb-4 font-serif">
            升级会员
          </h1>
          <p className="text-lg text-[#6B7F96] dark:text-slate-400 max-w-xl mx-auto">
            解锁无限 AI 对话、高级病例与机构培训方案
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl border-2 ${tier.color} ${tier.bg} p-6 flex flex-col ${
                tier.highlight ? "md:-mt-4 md:mb-4 shadow-xl shadow-amber-100 dark:shadow-amber-900/20" : ""
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                  推荐
                </div>
              )}
              <div className="text-3xl mb-3">{tier.icon}</div>
              <h2 className="text-xl font-bold text-[#1A2332] dark:text-slate-100 mb-1 font-serif">{tier.name}</h2>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-extrabold text-[#1A2332] dark:text-slate-100">{tier.price}</span>
                <span className="text-sm text-[#6B7F96] dark:text-slate-400">{tier.period}</span>
              </div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {tier.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className={f.ok ? "text-[#0F6E56] dark:text-emerald-400" : "text-[#C5D3E0] dark:text-slate-600"}>
                      {f.ok ? "✅" : "✕"}
                    </span>
                    <span className={f.ok ? "text-[#3D5166] dark:text-slate-300" : "text-[#C5D3E0] dark:text-slate-600 line-through"}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => document.getElementById("wechat-pay")?.scrollIntoView({ behavior: "smooth" })}
                className={`w-full py-3 rounded-lg font-medium transition-colors text-center ${tier.btn}`}
              >
                {tier.btnText}
              </button>
            </div>
          ))}
        </div>

        <div id="wechat-pay" className="card mb-16 text-center scroll-mt-20">
          <h2 className="text-xl font-semibold text-[#1A2332] dark:text-slate-100 mb-4 font-serif">💳 微信支付</h2>
          <p className="text-sm text-[#6B7F96] dark:text-slate-400 mb-6">
            扫码支付后备注注册邮箱，会员权益将在 24 小时内开通
          </p>
          <div className="w-48 h-48 mx-auto mb-4 rounded-xl flex items-center justify-center bg-white dark:bg-slate-800 border border-[#E8ECF0] dark:border-slate-700">
            <div className="text-center">
              <div className="text-4xl mb-2">📱</div>
              <p className="text-xs text-[#8FA0B4] dark:text-slate-500">扫码支付</p>
              <p className="text-xs text-[#1B4F8A] dark:text-blue-400 font-medium mt-1">¥199 / 年</p>
            </div>
          </div>
          <p className="text-xs text-[#8FA0B4] dark:text-slate-500">
            支付问题？联系{" "}
            <a href="mailto:843002655@qq.com" className="text-[#1B4F8A] dark:text-blue-400 hover:underline">
              843002655@qq.com
            </a>
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-[#1A2332] dark:text-slate-100 mb-6 text-center font-serif">❓ 常见问题</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <details key={i} className="card group cursor-pointer">
                <summary className="flex items-center justify-between text-sm font-medium text-[#1A2332] dark:text-slate-100 list-none">
                  {faq.q}
                  <span className="text-[#8FA0B4] dark:text-slate-500 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-2 text-sm text-[#6B7F96] dark:text-slate-400 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="text-center mt-12">
          <Link href={ROUTES.CASES} className="text-[#1B4F8A] dark:text-blue-400 hover:underline text-sm font-medium">
            先看看免费病例 →
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
