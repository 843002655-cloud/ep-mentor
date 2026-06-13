import AppLayout from "@/components/AppLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "使用条款与版权声明",
  description: "EP Mentor 使用条款、版权声明及免责声明",
};

export default function TermsPage() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-[#1A2332] dark:text-slate-100 mb-8 font-serif">使用条款与版权声明</h1>

        <div className="prose text-[#3D5166] dark:text-slate-300 leading-relaxed space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-[#1A2332] dark:text-slate-100 mb-3 font-serif">知识产权</h2>
            <p>
              EP Mentor（www.yovigo.cn）上所有病例内容、心电图描述、AI 对话模型及教学框架均为原创作品，受《中华人民共和国著作权法》保护。
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>所有病例文本、诊断逻辑、教学问题设计版权归 EP Mentor 所有</li>
              <li>AI 生成的对话内容不得用于训练其他模型或商业用途</li>
              <li>未经书面授权，禁止以任何形式复制、转载、镜像本站内容</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1A2332] dark:text-slate-100 mb-3 font-serif">禁止行为</h2>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>禁止使用爬虫、脚本或其他自动化工具批量抓取本站内容</li>
              <li>禁止将病例数据用于建立竞争性数据库或 AI 训练集</li>
              <li>禁止绕过 API 频率限制或以其他方式滥用服务</li>
              <li>禁止将本站内容打包出售、分发或用于商业培训（除非获得授权）</li>
            </ul>
            <p className="text-sm mt-2">
              违反上述条款者，我们将保留追究法律责任的权利，包括但不限于向侵权方服务器提供商投诉、向法院提起诉讼。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1A2332] dark:text-slate-100 mb-3 font-serif">用户生成内容</h2>
            <p>
              医生通过投稿功能提交的病例，投稿者保留原始版权，但授予 EP Mentor 在平台内展示、用于教学目的的非独占使用权。投稿者需确保已对患者信息进行脱敏处理。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1A2332] dark:text-slate-100 mb-3 font-serif">API 使用限制</h2>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>匿名用户：每 IP 每分钟最多 60 次 API 请求</li>
              <li>登录用户：每用户每分钟最多 120 次 API 请求</li>
              <li>如需更高频率接入，请联系管理员获取 API Key</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1A2332] dark:text-slate-100 mb-3 font-serif">联系方式</h2>
            <p className="text-sm">
              如发现侵权行为，或需要内容授权合作，请联系：843002655@qq.com
            </p>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
