import AppLayout from "@/components/AppLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "关于我们",
  description: "EP Mentor 由热爱电生理的工程师和临床医生共同打造的心脏电生理AI教学平台",
};

export default function AboutPage() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-[#1A2332] dark:text-slate-100 mb-6 font-serif">关于 EP Mentor</h1>
        <div className="prose text-[#3D5166] dark:text-slate-300 leading-relaxed space-y-4">
          <p>
            EP Mentor 是一个面向心脏电生理医生的 AI 教学平台，由一群热爱电生理的工程师和临床医生共同打造。
          </p>
          <p>
            我们相信，学习电生理最好的方式不是被动听课，而是在真实病例中通过苏格拉底式对话主动推导。
            AI 导师不会直接给你答案——它会像导管室里的资深术者一样，一层层引导你思考。
          </p>
          <p>
            平台所有病例均来自真实临床场景（已脱敏），AI 模型由 DeepSeek 驱动，数据库与认证服务由 Supabase 提供。
          </p>
          <div className="bg-[#F5F8FC] dark:bg-slate-800 border border-[#DDE5EE] dark:border-slate-700 rounded-xl p-6 mt-8">
            <h2 className="text-lg font-semibold text-[#1A2332] dark:text-slate-100 mb-2 font-serif">联系我们</h2>
            <p className="text-sm dark:text-slate-400">
              邮箱：843002655@qq.com<br />
              微信小程序即将上线，敬请期待。
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
