import Link from "next/link";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { ROUTES } from "@/lib/routes";

const footerLinks = {
  学习: [
    { label: "病例库", href: ROUTES.CASES },
    { label: "知识测验", href: ROUTES.QUIZ },
    { label: "资料库", href: ROUTES.LIBRARY },
    { label: "学习进度", href: ROUTES.DASHBOARD },
  ],
  平台: [
    { label: "关于我们", href: "/about" },
    { label: "升级会员", href: "/upgrade" },
    { label: "投稿病例", href: ROUTES.SUBMIT },
    { label: "管理后台", href: ROUTES.ADMIN },
  ],
  联系: [
    { label: "843002655@qq.com", href: "mailto:843002655@qq.com" },
    { label: "微信小程序即将上线", href: "#" },
  ],
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pb-16 md:pb-0">{children}</main>
      <BottomNav />

      <footer className="border-t border-[#E8ECF0] dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-3">
                <span className="text-2xl">⚡</span>
                <span className="text-lg font-bold text-[#1A2332] dark:text-slate-100 font-serif">
                  EP <span className="text-[#1B4F8A] dark:text-blue-400">Mentor</span>
                </span>
              </Link>
              <p className="text-sm text-[#8FA0B4] dark:text-slate-500 leading-relaxed">
                心脏电生理 AI 教学平台
                <br />
                用苏格拉底的方式，推演心律失常背后的电生理逻辑。
              </p>
            </div>

            {/* Links */}
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h4 className="text-sm font-semibold text-[#1A2332] dark:text-slate-100 mb-3">{title}</h4>
                <ul className="space-y-2">
                  {links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-sm text-[#6B7F96] dark:text-slate-400 hover:text-[#1B4F8A] dark:hover:text-blue-400 transition-colors"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="border-t border-[#E8ECF0] dark:border-slate-700 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8FA0B4] dark:text-slate-500">
            <p>
              © {new Date().getFullYear()} EP Mentor. 仅供医学教育使用，不构成临床决策建议。
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#1B4F8A] dark:hover:text-blue-400 transition-colors"
              >
                粤ICP备XXXXXXXX号
              </a>
              <Link href="/terms" className="hover:text-[#1B4F8A] dark:hover:text-blue-400 transition-colors">
                使用条款
              </Link>
              <span className="bg-[#F5F8FC] dark:bg-slate-800 border border-[#DDE5EE] dark:border-slate-700 rounded-full px-3 py-0.5 text-[#1B4F8A] dark:text-blue-400">
                微信小程序即将上线
              </span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
